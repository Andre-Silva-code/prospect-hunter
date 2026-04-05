import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { getLeadById, updateLeadRecord } from "@/lib/leads-repository";
import { getOutreachItemByLeadId } from "@/lib/outreach-queue-helpers";
import { enqueueOutreach, updateQueueItem } from "@/lib/outreach-queue";
import { checkWhatsAppNumber, sendTextMessage } from "@/lib/connectors/uazapi";
import { normalizePhoneForWhatsApp } from "@/lib/connectors/utils";
import { generatePostAnalysisMessage } from "@/lib/outreach-message";
import { logger } from "@/lib/logger";

function extractPhoneFromContact(contact: string): string | null {
  const parts = contact.split("|").map((p) => p.trim());
  for (const part of parts) {
    const normalized = normalizePhoneForWhatsApp(part);
    if (normalized) return normalized;
  }
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = (await request.json()) as { leadId: string };
  if (!leadId) {
    return NextResponse.json({ error: "leadId obrigatório" }, { status: 400 });
  }

  const lead = await getLeadById(sessionUser.id, leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  let outreachItem = await getOutreachItemByLeadId(sessionUser.id, leadId);

  // Lead adicionado manualmente — não tem entrada na fila ainda
  if (!outreachItem) {
    const phone = extractPhoneFromContact(lead.contact);
    if (!phone) {
      return NextResponse.json(
        { error: "Telefone não encontrado no campo contato do lead" },
        { status: 400 }
      );
    }

    // Verifica o número no WhatsApp para obter o JID real
    const check = await checkWhatsAppNumber(phone);
    if (!check.exists || !check.jid) {
      return NextResponse.json(
        { error: "Número não encontrado no WhatsApp. Verifique o telefone no cadastro do lead." },
        { status: 400 }
      );
    }

    // Cria a entrada na fila já com JID e status pdf_sent
    outreachItem = await enqueueOutreach(sessionUser.id, lead.id, phone);
    await updateQueueItem(outreachItem.id, {
      whatsappJid: check.jid,
      status: "pdf_sent",
      pdfGenerated: true,
    });

    // Recarrega o item atualizado
    outreachItem = {
      ...outreachItem,
      whatsappJid: check.jid,
      status: "pdf_sent",
      pdfGenerated: true,
    };
  }

  if (!outreachItem.whatsappJid) {
    return NextResponse.json(
      { error: "Número WhatsApp não encontrado para este lead" },
      { status: 400 }
    );
  }

  // 1. Enviar Mensagem 1 pós-análise imediatamente
  const msg1 = generatePostAnalysisMessage({ company: lead.company }, 1);
  const sendResult = await sendTextMessage(outreachItem.whatsappJid, msg1);

  if (!sendResult.success) {
    logger.error("Falha ao enviar msg 1 pós-análise", { error: sendResult.error });
    return NextResponse.json({ error: sendResult.error }, { status: 500 });
  }

  // 2. Atualizar status para pdf_sent (cron vai disparar msg 2 e 3)
  await updateQueueItem(outreachItem.id, {
    pdfGenerated: true,
    status: "pdf_sent",
  });

  // 3. Atualizar lead
  await updateLeadRecord(sessionUser.id, leadId, {
    contactStatus: "Respondeu",
    stage: "Diagnóstico",
  });

  logger.info("Relatório marcado como enviado, msg 1 disparada", { company: lead.company });

  return NextResponse.json({ success: true, company: lead.company });
}
