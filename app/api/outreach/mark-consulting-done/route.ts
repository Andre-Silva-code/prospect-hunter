import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { getQueueItemByLeadId, updateQueueItem } from "@/lib/outreach-queue";
import { getLeadById, updateLeadRecord } from "@/lib/leads-repository";
import { processPostConsultingFollowUp } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";

export async function POST(request: Request): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = (await request.json()) as { leadId?: string };
  if (!leadId) {
    return NextResponse.json({ error: "leadId obrigatorio" }, { status: 400 });
  }

  const lead = await getLeadById(sessionUser.id, leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
  }

  let queueItem = await getQueueItemByLeadId(leadId);

  // Se não existe item na fila (lead adicionado manualmente com WA), criar um
  if (!queueItem && lead.contact) {
    const { enqueueOutreach } = await import("@/lib/outreach-queue");
    const { normalizePhoneForWhatsApp } = await import("@/lib/connectors/utils");
    const phone = normalizePhoneForWhatsApp(lead.contact);
    if (phone) {
      queueItem = await enqueueOutreach(sessionUser.id, leadId, phone);
      await updateQueueItem(queueItem.id, {
        status: "replied",
        whatsappJid: `${phone}@s.whatsapp.net`,
      });
      queueItem = await getQueueItemByLeadId(leadId);
    }
  }

  if (!queueItem?.whatsappJid) {
    return NextResponse.json(
      { error: "Sem JID WhatsApp para este lead — outreach manual necessario" },
      { status: 422 }
    );
  }

  try {
    const result = await processPostConsultingFollowUp(queueItem, lead, 1);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // Consultoria concluída — avançar lead para "Proposta"
    await updateLeadRecord(sessionUser.id, leadId, {
      stage: "Proposta",
      proposalEnteredAt: new Date().toISOString(),
      proposalFollowUpStep: 0,
      lastContactAt: new Date().toISOString(),
    });

    logger.info("Consultoria marcada como feita", { leadId });
    return NextResponse.json({ success: true, message: "Mensagem pos-consultoria enviada" });
  } catch (error) {
    logger.error("Erro ao marcar consultoria", {
      leadId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
