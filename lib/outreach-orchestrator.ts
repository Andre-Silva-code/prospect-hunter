import type { LeadRecord } from "@/types/prospecting";
import type { OutreachQueueItem } from "@/types/outreach";
import { normalizePhoneForWhatsApp } from "@/lib/connectors/utils";
import {
  checkWhatsAppNumber,
  isUazapiConfigured,
  sendDocumentMessage,
  sendTextMessage,
} from "@/lib/connectors/uazapi";
import { enqueueOutreach, updateQueueItem } from "@/lib/outreach-queue";
import { captureGbpCheckReport } from "@/lib/pdf/gbpcheck-capture";
import {
  generateGmnWhatsAppMessage,
  generateGmnFollowUpMessage,
  generatePostAnalysisMessage,
  generateProposalFollowUpMessage,
  generateReactivationMessage,
} from "@/lib/outreach-message";
import { checkUazapiRateLimit } from "@/lib/rate-limiter";

const MAX_SEND_ATTEMPTS = 3;

/**
 * Extrai telefone do campo contact (que pode ser "website | phone" ou só phone).
 */
function extractPhoneFromContact(contact: string): string | null {
  const parts = contact.split("|").map((p) => p.trim());
  for (const part of parts) {
    const normalized = normalizePhoneForWhatsApp(part);
    if (normalized) return normalized;
  }
  return null;
}

/** Delay aleatório entre 25-35 minutos (em ms) para parecer orgânico.
 * Pode ser zerado via OUTREACH_DELAY_MS=0 para testes. */
function randomDelay(): number {
  const override = process.env.OUTREACH_DELAY_MS;
  if (override !== undefined) return Math.max(0, parseInt(override, 10) || 0);
  return (25 + Math.random() * 10) * 60 * 1000;
}

/**
 * Ponto de entrada: inicia o fluxo de outreach para um lead GMN.
 * Chamado após o lead ser salvo no CRM.
 */
export async function initiateGmnOutreach(
  userId: string,
  lead: LeadRecord
): Promise<{ queued: boolean; reason: string }> {
  if (!isUazapiConfigured()) {
    return { queued: false, reason: "Uazapi nao configurado" };
  }

  if (lead.source !== "Google Meu Negócio") {
    return { queued: false, reason: "Lead nao e GMN" };
  }

  const minScore = parseInt(process.env.OUTREACH_MIN_SCORE ?? "65", 10);
  if (lead.score < minScore) {
    return { queued: false, reason: `Score ${lead.score} abaixo do minimo (${minScore})` };
  }

  const normalized = extractPhoneFromContact(lead.contact);
  if (!normalized) {
    return { queued: false, reason: "Telefone invalido ou ausente" };
  }

  const item = await enqueueOutreach(userId, lead.id, normalized);

  // Fire-and-forget: verificar número e agendar
  verifyAndSchedule(item).catch(() => {
    // Erro silencioso — será tratado pelo cron
  });

  return { queued: true, reason: `Enfileirado (${item.id})` };
}

/**
 * Verifica se o número existe no WhatsApp e agenda o envio.
 */
export async function verifyAndSchedule(item: OutreachQueueItem): Promise<void> {
  const check = await checkWhatsAppNumber(item.phone);

  if (!check.exists) {
    await updateQueueItem(item.id, {
      status: "phone_invalid",
      lastError: "Numero nao encontrado no WhatsApp",
    });
    return;
  }

  const scheduledAt = new Date(Date.now() + randomDelay()).toISOString();

  await updateQueueItem(item.id, {
    status: "scheduled",
    whatsappJid: check.jid,
    scheduledAt,
  });
}

/**
 * Processa um item agendado: envia apenas mensagem de texto de prospecção.
 * O relatório GBP Check só é enviado quando o lead responder (via webhook).
 * Chamado pelo cron a cada 5 minutos.
 */
export async function processScheduledOutreach(
  item: OutreachQueueItem,
  lead: LeadRecord
): Promise<{ success: boolean; error: string | null }> {
  const rateCheck = checkUazapiRateLimit(item.userId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Rate limit — retry em ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`,
    };
  }

  if (!item.whatsappJid) {
    await updateQueueItem(item.id, { status: "failed", lastError: "JID ausente" });
    return { success: false, error: "JID ausente" };
  }

  try {
    // 1. Gerar mensagem de prospecção (apenas texto, sem PDF)
    const message = generateGmnWhatsAppMessage({
      company: lead.company,
      region: lead.region,
    });

    // 2. Enviar texto via WhatsApp
    const sendResult = await sendTextMessage(item.whatsappJid, message);

    if (!sendResult.success) {
      const attempts = item.attemptCount + 1;
      if (attempts >= MAX_SEND_ATTEMPTS) {
        await updateQueueItem(item.id, {
          status: "failed",
          attemptCount: attempts,
          lastError: sendResult.error,
        });
        return { success: false, error: sendResult.error };
      }

      await updateQueueItem(item.id, {
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        attemptCount: attempts,
        lastError: sendResult.error,
      });
      return { success: false, error: sendResult.error };
    }

    // 3. Sucesso — marcar como enviado (PDF será gerado só quando responder)
    await updateQueueItem(item.id, {
      status: "sent",
      sentAt: new Date().toISOString(),
      messageId: sendResult.messageId,
      pdfGenerated: false,
      attemptCount: item.attemptCount + 1,
      lastError: null,
    });

    return { success: true, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    const attempts = item.attemptCount + 1;

    await updateQueueItem(item.id, {
      status: attempts >= MAX_SEND_ATTEMPTS ? "failed" : "scheduled",
      scheduledAt:
        attempts < MAX_SEND_ATTEMPTS
          ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
          : item.scheduledAt,
      attemptCount: attempts,
      lastError: errorMsg,
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * Gera relatório GBP Check e envia PDF para o lead.
 * Chamado quando o lead responde positivamente (via webhook).
 */
export async function sendGbpCheckReport(
  item: OutreachQueueItem,
  lead: LeadRecord
): Promise<{ success: boolean; error: string | null }> {
  if (!item.whatsappJid) {
    return { success: false, error: "JID ausente" };
  }

  try {
    // 1. Gerar PDF via GBP Check
    const captureResult = await captureGbpCheckReport(lead.company);
    if (!captureResult.success || !captureResult.pdfBuffer) {
      return { success: false, error: captureResult.error || "Falha ao capturar relatório" };
    }

    // 2. Enviar PDF via WhatsApp
    const pdfBase64 = captureResult.pdfBuffer.toString("base64");
    const fileName = `analise-gmn-${lead.company.replace(/\s+/g, "-").toLowerCase()}.pdf`;

    const sendResult = await sendDocumentMessage(
      item.whatsappJid,
      `Segue a análise do perfil da ${lead.company} no Google! Qualquer dúvida, estou à disposição.`,
      pdfBase64,
      fileName
    );

    if (!sendResult.success) {
      return { success: false, error: sendResult.error };
    }

    // 3. Atualizar status para pdf_sent
    await updateQueueItem(item.id, {
      pdfGenerated: true,
      status: "pdf_sent",
    });

    // 4. Enviar Mensagem 1 pós-análise imediatamente após o PDF
    const followUpMsg = generatePostAnalysisMessage({ company: lead.company }, 1);
    await sendTextMessage(item.whatsappJid, followUpMsg);

    return { success: true, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    return { success: false, error: errorMsg };
  }
}

/**
 * Envia follow-up para leads que não responderam.
 * Chamado pelo cron diário.
 */
export async function processFollowUp(
  item: OutreachQueueItem,
  lead: LeadRecord,
  step: 1 | 2
): Promise<{ success: boolean; error: string | null }> {
  const rateCheck = checkUazapiRateLimit(item.userId);
  if (!rateCheck.allowed) {
    return { success: false, error: "Rate limit" };
  }

  if (!item.whatsappJid) {
    return { success: false, error: "JID ausente" };
  }

  const message = generateGmnFollowUpMessage({ company: lead.company }, step);
  const sendResult = await sendTextMessage(item.whatsappJid, message);

  if (!sendResult.success) {
    return { success: false, error: sendResult.error };
  }

  const nextStatus = step === 1 ? "follow_up_1" : "follow_up_2";
  await updateQueueItem(item.id, {
    status: nextStatus,
    messageId: sendResult.messageId,
  });

  return { success: true, error: null };
}

/**
 * Envia follow-up pós-análise para leads que receberam o PDF mas não responderam.
 * step 2 = Mensagem 2 (24h após PDF), step 3 = Mensagem 3 (48h após Mensagem 2).
 */
export async function processPostAnalysisFollowUp(
  item: OutreachQueueItem,
  lead: LeadRecord,
  step: 2 | 3
): Promise<{ success: boolean; error: string | null }> {
  const rateCheck = checkUazapiRateLimit(item.userId);
  if (!rateCheck.allowed) {
    return { success: false, error: "Rate limit" };
  }

  if (!item.whatsappJid) {
    return { success: false, error: "JID ausente" };
  }

  const message = generatePostAnalysisMessage({ company: lead.company }, step);
  const sendResult = await sendTextMessage(item.whatsappJid, message);

  if (!sendResult.success) {
    return { success: false, error: sendResult.error };
  }

  const nextStatus = step === 2 ? "post_analysis_1" : "post_analysis_2";
  await updateQueueItem(item.id, {
    status: nextStatus,
    messageId: sendResult.messageId,
  });

  return { success: true, error: null };
}

/**
 * Marca um item como "respondeu" (chamado pelo webhook).
 */
export async function markAsReplied(item: OutreachQueueItem): Promise<void> {
  await updateQueueItem(item.id, { status: "replied" });
}

/**
 * Envia follow-up para leads em "Proposta" sem resposta.
 * step 1 = D+1, step 2 = D+3, step 3 = D+7.
 */
export async function processProposalFollowUp(
  lead: LeadRecord,
  jid: string,
  step: 1 | 2 | 3
): Promise<{ success: boolean; error: string | null }> {
  const rateCheck = checkUazapiRateLimit(lead.userId);
  if (!rateCheck.allowed) {
    return { success: false, error: "Rate limit" };
  }

  const message = generateProposalFollowUpMessage({ company: lead.company }, step);
  const sendResult = await sendTextMessage(jid, message);

  if (!sendResult.success) {
    return { success: false, error: sendResult.error };
  }

  return { success: true, error: null };
}

/**
 * Envia mensagem de reativacao para leads "Perdido" apos 30 dias.
 */
export async function processReactivation(
  lead: LeadRecord,
  jid: string
): Promise<{ success: boolean; error: string | null }> {
  const rateCheck = checkUazapiRateLimit(lead.userId);
  if (!rateCheck.allowed) {
    return { success: false, error: "Rate limit" };
  }

  const message = generateReactivationMessage({ company: lead.company });
  const sendResult = await sendTextMessage(jid, message);

  if (!sendResult.success) {
    return { success: false, error: sendResult.error };
  }

  return { success: true, error: null };
}
