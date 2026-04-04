import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { getLeadById, updateLeadRecord } from "@/lib/leads-repository";
import { getOutreachItemByLeadId } from "@/lib/outreach-queue-helpers";
import { captureGbpCheckReport } from "@/lib/pdf/gbpcheck-capture";
import { sendDocumentMessage } from "@/lib/connectors/uazapi";
import { updateQueueItem } from "@/lib/outreach-queue";
import { logger } from "@/lib/logger";

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

  const outreachItem = await getOutreachItemByLeadId(sessionUser.id, leadId);
  if (!outreachItem?.whatsappJid) {
    return NextResponse.json(
      { error: "Número WhatsApp não encontrado para este lead" },
      { status: 400 }
    );
  }

  logger.info("Gerando relatório GBP Check", { company: lead.company });

  // 1. Gerar PDF via GBP Check (usa Chrome local com extensão)
  const captureResult = await captureGbpCheckReport(lead.company);
  if (!captureResult.success || !captureResult.pdfBuffer) {
    logger.error("Falha ao gerar PDF", { error: captureResult.error });
    return NextResponse.json(
      { error: captureResult.error ?? "Falha ao gerar relatório" },
      { status: 500 }
    );
  }

  // 2. Enviar PDF via WhatsApp
  const pdfBase64 = captureResult.pdfBuffer.toString("base64");
  const fileName = `analise-gmn-${lead.company.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  const sendResult = await sendDocumentMessage(
    outreachItem.whatsappJid,
    `Segue a análise do perfil da ${lead.company} no Google! Qualquer dúvida, estou à disposição. 😊`,
    pdfBase64,
    fileName
  );

  if (!sendResult.success) {
    return NextResponse.json({ error: sendResult.error }, { status: 500 });
  }

  // 3. Atualizar status
  await updateQueueItem(outreachItem.id, { pdfGenerated: true });
  await updateLeadRecord(sessionUser.id, leadId, {
    contactStatus: "Respondeu",
    stage: "Diagnóstico",
  });

  logger.info("Relatório enviado com sucesso", { company: lead.company });

  return NextResponse.json({ success: true, company: lead.company });
}
