import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { getQueueItemByLeadId, updateQueueItem } from "@/lib/outreach-queue";
import { getLeadById } from "@/lib/leads-repository";
import { startSemGmnPostPreview } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";

/**
 * Dispara a sequência de pós-prévia para um lead "Sem Google Meu Negócio".
 *
 * Usado pelo botão "Enviar prévia" no CRM, DEPOIS que o operador já enviou ao
 * lead a prévia/mockup de como a ficha ficaria. Envia a Mensagem 1 (confirma a
 * prévia + link de agenda) e marca o status para a sequência de follow-ups
 * pós-prévia (D+2, D+4) rodar automaticamente.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = (await request.json().catch(() => ({}))) as { leadId?: string };
  if (!leadId) {
    return NextResponse.json({ error: "leadId obrigatorio" }, { status: 400 });
  }

  const lead = await getLeadById(sessionUser.id, leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
  }

  if (lead.source !== "Sem Google Meu Negócio") {
    return NextResponse.json(
      { error: "Este fluxo é apenas para leads Sem Google Meu Negócio" },
      { status: 400 }
    );
  }

  let queueItem = await getQueueItemByLeadId(leadId);

  // Se não há item na fila (lead manual), cria um já pronto para envio.
  if (!queueItem && lead.contact) {
    const { enqueueOutreach } = await import("@/lib/outreach-queue");
    const { normalizePhoneForWhatsApp } = await import("@/lib/connectors/utils");
    const phone = normalizePhoneForWhatsApp(lead.contact);
    if (phone) {
      queueItem = await enqueueOutreach(sessionUser.id, leadId, phone);
      await updateQueueItem(queueItem.id, {
        whatsappJid: `${phone}@s.whatsapp.net`,
      });
      queueItem = await getQueueItemByLeadId(leadId);
    }
  }

  if (!queueItem?.whatsappJid) {
    return NextResponse.json(
      { error: "Sem WhatsApp para este lead — não é possível enviar a prévia automaticamente" },
      { status: 422 }
    );
  }

  try {
    const result = await startSemGmnPostPreview(queueItem, lead);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    logger.info("Pós-prévia sem-GMN iniciada", { leadId });
    return NextResponse.json({ success: true, message: "Sequência de pós-prévia iniciada" });
  } catch (error) {
    logger.error("Erro ao iniciar pós-prévia sem-GMN", {
      leadId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
