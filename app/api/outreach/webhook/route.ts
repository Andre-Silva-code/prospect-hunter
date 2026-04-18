import { NextResponse } from "next/server";

import { updateQueueItem } from "@/lib/outreach-queue";
import { updateLeadRecord, getLeadById } from "@/lib/leads-repository";
import { sendTextMessage } from "@/lib/connectors/uazapi";
import { notifyOwner } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";

type UazapiWebhookPayload = {
  event?: string;
  data?: {
    from?: string;
    messageId?: string;
    body?: string;
  };
};

/**
 * Padrões de resposta negativa — lead não tem interesse.
 * Quando detectado, ignora a mensagem sem avançar o card.
 */
const negativePatterns = [
  /\bnão\b/,
  /\bnao\b/,
  /\bn[aã]o quero\b/,
  /\bnegativo\b/,
  /\bdispenso\b/,
  /\bnão preciso\b/,
  /\bnao preciso\b/,
  /\bnão tenho interesse\b/,
  /\bnao tenho interesse\b/,
  /\bdeixa pra l[aá]\b/,
  /\bobrigado n[aã]o\b/,
  /\bn[aã]o obrigado\b/,
  /\bnope\b/,
  /^\s*n\s*$/,
];

/**
 * Padrões de resposta automática de bot/atendente virtual.
 * Quando detectado, ignora silenciosamente — não avança o card,
 * não envia mensagem de qualificação.
 */
const botPatterns = [
  /atendimento autom[aá]tico/,
  /mensagem autom[aá]tica/,
  /resposta autom[aá]tica/,
  /bot de atendimento/,
  /fora do hor[aá]rio/,
  /fora de hora/,
  /horário de atendimento/,
  /nossa equipe.*entrar[aá] em contato/,
  /em breve.*retornar/,
  /retornaremos em breve/,
  /obrigado por entrar em contato/,
  /recebemos sua mensagem/,
  /sua mensagem foi recebida/,
  /como posso (te |lhe |)?ajudar/,
  /olá.*como posso/,
  /oi.*como posso/,
  /bem[- ]vindo.*atendimento/,
  /seja bem[- ]vindo/,
  /para falar com.*tecle/,
  /selecione uma op[cç][aã]o/,
  /digite \d para/,
  /envie \d para/,
  /op[cç][aã]o \d/,
];

/**
 * Padrões de confirmação de qualificação — lead confirma ser o responsável.
 * Quando detectado após "awaiting_qualification", avança para Diagnóstico.
 */
const qualificationConfirmPatterns = [
  /\bsim\b/,
  /\byes\b/,
  /\bpode\b/,
  /\bclaro\b/,
  /\bcom certeza\b/,
  /\bcerto\b/,
  /\bexato\b/,
  /\bconfirmo\b/,
  /\bsou eu\b/,
  /\bsou\b/,
  /\brespons[aá]vel\b/,
  /\btopei\b/,
  /\btopo\b/,
  /^\s*s\s*$/,
  /^\s*ok\s*$/,
];

function isBot(message: string): boolean {
  return botPatterns.some((pattern) => pattern.test(message));
}

function isNegative(message: string): boolean {
  return negativePatterns.some((pattern) => pattern.test(message));
}

function isQualificationConfirm(message: string): boolean {
  return qualificationConfirmPatterns.some((pattern) => pattern.test(message));
}

export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = process.env.UAZAPI_WEBHOOK_SECRET;
  if (webhookSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const payload = (await request.json()) as UazapiWebhookPayload;
    const senderJid = payload.data?.from;

    if (!senderJid) {
      return NextResponse.json({ status: "ignored", reason: "no sender" });
    }

    logger.info("Webhook received", { event: payload.event, from: senderJid });

    const messageBody = (payload.data?.body ?? "").trim().toLowerCase();

    // 1. Ignorar respostas negativas
    if (isNegative(messageBody)) {
      return NextResponse.json({ status: "ignored", reason: "negative response" });
    }

    // 2. Ignorar respostas automáticas de bot
    if (isBot(messageBody)) {
      logger.info("Bot response detected, ignoring", { from: senderJid });
      return NextResponse.json({ status: "ignored", reason: "bot response" });
    }

    const { listAllOutreachItems } = await import("@/lib/outreach-queue-helpers");
    const matchingItem = await listAllOutreachItems(senderJid);

    if (!matchingItem) {
      return NextResponse.json({ status: "ignored", reason: "no matching outreach item" });
    }

    const lead = await getLeadById(matchingItem.userId, matchingItem.leadId);

    // 3. Lead estava aguardando qualificação — verificar se confirmou
    if (matchingItem.status === "awaiting_qualification") {
      if (isQualificationConfirm(messageBody)) {
        // Confirmou — avançar para Diagnóstico
        await updateQueueItem(matchingItem.id, { status: "replied" });
        await updateLeadRecord(matchingItem.userId, matchingItem.leadId, {
          contactStatus: "Respondeu",
          stage: "Diagnóstico",
          lastContactAt: new Date().toISOString(),
        });

        logger.info("Lead qualified and advanced to Diagnóstico", {
          leadId: matchingItem.leadId,
        });

        sendTextMessage(
          senderJid,
          `Ótimo! Vou preparar a análise do perfil da ${lead?.company ?? "sua empresa"} no Google e envio em breve. Aguarde!`
        ).catch(() => {});

        await notifyOwner(
          `🔔 Lead qualificado e respondeu!\n\nEmpresa: ${lead?.company ?? matchingItem.leadId}\nRegião: ${lead?.region ?? "-"}\n\nAcesse o CRM → card em "Diagnóstico" → clique em "Enviar Relatório GBP Check".`
        );
      } else {
        // Resposta ambígua após qualificação — ignora, aguarda nova resposta
        logger.info("Ambiguous qualification response, waiting", {
          leadId: matchingItem.leadId,
          message: messageBody,
        });
      }

      return NextResponse.json({ status: "processed", leadId: matchingItem.leadId });
    }

    const isPostAnalysis = ["pdf_sent", "post_analysis_1", "post_analysis_2"].includes(
      matchingItem.status
    );

    if (isPostAnalysis) {
      // Lead respondeu após receber a análise — quer reunião
      await updateQueueItem(matchingItem.id, { status: "replied" });
      await updateLeadRecord(matchingItem.userId, matchingItem.leadId, {
        contactStatus: "Respondeu",
        stage: "Proposta",
        lastContactAt: new Date().toISOString(),
        proposalEnteredAt: new Date().toISOString(),
        proposalFollowUpStep: 0,
      });

      logger.info("Lead replied post-analysis", { leadId: matchingItem.leadId });

      sendTextMessage(
        senderJid,
        `Que ótimo, ${lead?.company ?? ""}! Vou entrar em contato para agendarmos uma conversa rápida. Fique de olho! 🤝`
      ).catch(() => {});

      await notifyOwner(
        `✅ Lead interessado em reunião!\n\nEmpresa: ${lead?.company ?? matchingItem.leadId}\nRegião: ${lead?.region ?? "-"}\n\nEstá aguardando contato para agendar. Acesse o CRM → card em "Proposta".`
      );
    } else {
      // 4. Primeira resposta ao outreach — enviar mensagem de qualificação
      //    antes de avançar o card (filtra bots que escaparam da detecção)
      await updateQueueItem(matchingItem.id, { status: "awaiting_qualification" });

      logger.info("Sending qualification message", { leadId: matchingItem.leadId });

      sendTextMessage(
        senderJid,
        `Oi! Só para confirmar — você é o responsável pelo marketing ou pelo Google da ${lead?.company ?? "empresa"}?`
      ).catch(() => {});
    }

    return NextResponse.json({ status: "processed", leadId: matchingItem.leadId });
  } catch (error) {
    logger.error("Webhook error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
