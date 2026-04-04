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

    // Verificar se a mensagem é uma confirmação ("sim" em qualquer capitalização)
    const messageBody = (payload.data?.body ?? "").trim().toLowerCase();
    if (!messageBody.includes("sim")) {
      return NextResponse.json({ status: "ignored", reason: "not a confirmation" });
    }

    const { listAllOutreachItems } = await import("@/lib/outreach-queue-helpers");
    const matchingItem = await listAllOutreachItems(senderJid);

    if (!matchingItem) {
      return NextResponse.json({ status: "ignored", reason: "no matching outreach item" });
    }

    // Atualizar fila — marcar como respondido
    await updateQueueItem(matchingItem.id, { status: "replied" });

    // Atualizar lead no CRM
    await updateLeadRecord(matchingItem.userId, matchingItem.leadId, {
      contactStatus: "Respondeu",
      stage: "Diagnóstico",
      lastContactAt: new Date().toISOString(),
    });

    logger.info("Lead marked as replied", { leadId: matchingItem.leadId });

    const lead = await getLeadById(matchingItem.userId, matchingItem.leadId);

    // Confirmar ao lead que o relatório está sendo preparado
    sendTextMessage(
      senderJid,
      `Ótimo! Vou preparar a análise do perfil da ${lead?.company ?? "sua empresa"} no Google e envio em breve. Aguarde!`
    ).catch(() => {});

    // Notificar o dono do sistema para gerar e enviar o PDF
    const ownerPhone = process.env.OWNER_PHONE;
    if (ownerPhone) {
      const ownerJid = ownerPhone.startsWith("55") ? ownerPhone : `55${ownerPhone}`;
      sendTextMessage(
        ownerJid,
        `🔔 Lead respondeu!\n\nEmpresa: ${lead?.company ?? matchingItem.leadId}\nRegião: ${lead?.region ?? "-"}\n\nAcesse o CRM → aba "Pipeline" → card em "Diagnóstico" → clique em "Enviar Relatório GBP Check".`
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
