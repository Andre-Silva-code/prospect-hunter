import { NextResponse } from "next/server";

import { updateQueueItem } from "@/lib/outreach-queue";
import { updateLeadRecord } from "@/lib/leads-repository";
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

    // Buscar na fila por JID — precisamos iterar (não temos índice por JID no file storage)
    // Em produção (Supabase), isso seria uma query direta
    const { listAllOutreachItems } = await import("@/lib/outreach-queue-helpers");
    const matchingItem = await listAllOutreachItems(senderJid);

    if (!matchingItem) {
      return NextResponse.json({ status: "ignored", reason: "no matching outreach item" });
    }

    // Atualizar fila
    await updateQueueItem(matchingItem.id, { status: "replied" });

    // Atualizar lead no CRM
    await updateLeadRecord(matchingItem.userId, matchingItem.leadId, {
      contactStatus: "Respondeu",
      stage: "Diagnóstico",
      lastContactAt: new Date().toISOString(),
    });

    logger.info("Lead marked as replied", { leadId: matchingItem.leadId });

    return NextResponse.json({ status: "processed", leadId: matchingItem.leadId });
  } catch (error) {
    logger.error("Webhook error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
