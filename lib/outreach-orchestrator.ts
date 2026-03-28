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
import { extractGbpAuditData } from "@/lib/pdf/extract-audit-data";
import { generateGbpAuditPdf } from "@/lib/pdf/gbp-audit-pdf";
import { generateGmnWhatsAppMessage, generateGmnFollowUpMessage } from "@/lib/outreach-message";
import { checkUazapiRateLimit } from "@/lib/rate-limiter";

const BRAND_NAME = process.env.OUTREACH_BRAND_NAME ?? "Prospect Hunter";
const BRAND_COLOR = process.env.OUTREACH_BRAND_COLOR ?? "#a04b2c";
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

/** Delay aleatório entre 25-35 minutos (em ms) para parecer orgânico. */
function randomDelay(): number {
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
 * Processa um item agendado: gera PDF, envia mensagem + documento.
 * Chamado pelo cron a cada 5 minutos.
 */
export async function processScheduledOutreach(
  item: OutreachQueueItem,
  lead: LeadRecord
): Promise<{ success: boolean; error: string | null }> {
  // Rate limit
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
    // 1. Gerar PDF teaser
    const auditData = extractGbpAuditData(lead);
    const pdfBuffer = await generateGbpAuditPdf({
      data: auditData,
      blurredFields: ["improvements", "competitors", "responseRate", "categoryOptimization"],
      brandName: BRAND_NAME,
      brandColor: BRAND_COLOR,
    });

    // 2. Gerar mensagem
    const message = generateGmnWhatsAppMessage({
      company: lead.company,
      region: lead.region,
    });

    // 3. Enviar documento + mensagem
    const pdfBase64 = pdfBuffer.toString("base64");
    const fileName = `analise-gmn-${lead.company.replace(/\s+/g, "-").toLowerCase()}.pdf`;

    const sendResult = await sendDocumentMessage(item.whatsappJid, message, pdfBase64, fileName);

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

      // Reagendar para daqui a 5 minutos
      await updateQueueItem(item.id, {
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        attemptCount: attempts,
        lastError: sendResult.error,
      });
      return { success: false, error: sendResult.error };
    }

    // 4. Sucesso — atualizar status
    await updateQueueItem(item.id, {
      status: "sent",
      sentAt: new Date().toISOString(),
      messageId: sendResult.messageId,
      pdfGenerated: true,
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
 * Marca um item como "respondeu" (chamado pelo webhook).
 */
export async function markAsReplied(item: OutreachQueueItem): Promise<void> {
  await updateQueueItem(item.id, { status: "replied" });
}
