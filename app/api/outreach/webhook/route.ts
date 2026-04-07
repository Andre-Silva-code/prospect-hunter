import { NextResponse } from "next/server";

import { updateQueueItem } from "@/lib/outreach-queue";
import { updateLeadRecord, getLeadById } from "@/lib/leads-repository";
import { sendTextMessage } from "@/lib/connectors/uazapi";
import { logger } from "@/lib/logger";

type UazapiWebhookPayload = {
  event?: string;
  data?: {
    from?: string;
    messageId?: string;
    body?: string;
  };
};

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

    // Ignorar apenas respostas claramente negativas
    const messageBody = (payload.data?.body ?? "").trim().toLowerCase();
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
    const isNegative = negativePatterns.some((pattern) => pattern.test(messageBody));
    if (isNegative) {
      return NextResponse.json({ status: "ignored", reason: "negative response" });
    }

    const { listAllOutreachItems } = await import("@/lib/outreach-queue-helpers");
    const matchingItem = await listAllOutreachItems(senderJid);

    if (!matchingItem) {
      return NextResponse.json({ status: "ignored", reason: "no matching outreach item" });
    }

    const isPostAnalysis = ["pdf_sent", "post_analysis_1", "post_analysis_2"].includes(
      matchingItem.status
    );

    const lead = await getLeadById(matchingItem.userId, matchingItem.leadId);

    // Atualizar fila — marcar como respondido
    await updateQueueItem(matchingItem.id, { status: "replied" });

    if (isPostAnalysis) {
      // Lead respondeu após receber a análise — quer reunião
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

      const ownerPhone = process.env.OWNER_PHONE;
      if (ownerPhone) {
        const ownerJid = ownerPhone.startsWith("55") ? ownerPhone : `55${ownerPhone}`;
        sendTextMessage(
          ownerJid,
          `✅ Lead interessado em reunião!\n\nEmpresa: ${lead?.company ?? matchingItem.leadId}\nRegião: ${lead?.region ?? "-"}\n\nEstá aguardando contato para agendar. Acesse o CRM → card em "Reunião".`
        ).catch(() => {});
      }
    } else {
      // Resposta inicial ao "Responda SIM" — preparar análise
      await updateLeadRecord(matchingItem.userId, matchingItem.leadId, {
        contactStatus: "Respondeu",
        stage: "Diagnóstico",
        lastContactAt: new Date().toISOString(),
      });

      logger.info("Lead marked as replied", { leadId: matchingItem.leadId });

      sendTextMessage(
        senderJid,
        `Ótimo! Vou preparar a análise do perfil da ${lead?.company ?? "sua empresa"} no Google e envio em breve. Aguarde!`
      ).catch(() => {});

      const ownerPhone = process.env.OWNER_PHONE;
      if (ownerPhone) {
        const ownerJid = ownerPhone.startsWith("55") ? ownerPhone : `55${ownerPhone}`;
        sendTextMessage(
          ownerJid,
          `🔔 Lead respondeu!\n\nEmpresa: ${lead?.company ?? matchingItem.leadId}\nRegião: ${lead?.region ?? "-"}\n\nAcesse o CRM → aba "Pipeline" → card em "Diagnóstico" → clique em "Enviar Relatório GBP Check".`
        ).catch(() => {});
      }
    }

    return NextResponse.json({ status: "processed", leadId: matchingItem.leadId });
  } catch (error) {
    logger.error("Webhook error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
