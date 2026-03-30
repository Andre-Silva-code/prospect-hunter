import { NextResponse } from "next/server";

import { updateQueueItem } from "@/lib/outreach-queue";
import { updateLeadRecord, getLeadById } from "@/lib/leads-repository";
import { sendGbpCheckReport } from "@/lib/outreach-orchestrator";
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

    // Gerar e enviar relatório GBP Check (fire-and-forget)
    if (!matchingItem.pdfGenerated) {
      const lead = await getLeadById(matchingItem.userId, matchingItem.leadId);
      if (lead) {
        logger.info("Gerando relatório GBP Check para lead", { company: lead.company });
        sendGbpCheckReport(matchingItem, lead)
          .then((result) => {
            if (result.success) {
              logger.info("Relatório GBP Check enviado", { company: lead.company });
            } else {
              logger.error("Falha ao enviar relatório GBP Check", { error: result.error });
            }
          })
          .catch((err) => {
            logger.error("Erro ao gerar relatório GBP Check", {
              error: err instanceof Error ? err.message : "unknown",
            });
          });
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
