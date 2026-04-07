import { NextResponse } from "next/server";

import { getFollowUpDueItems, getQueueItemByLeadId } from "@/lib/outreach-queue";
import { listLeads, listAllLeads, updateLeadRecord } from "@/lib/leads-repository";
import {
  processFollowUp,
  processPostAnalysisFollowUp,
  processPostConsultingFollowUp,
  processProposalFollowUp,
  processReactivation,
} from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";
import type { LeadRecord } from "@/types/prospecting";

export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.OUTREACH_CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Follow-up 1: leads enviados há 3+ dias sem resposta
    const sentDue = await getFollowUpDueItems("sent", 3);
    // Follow-up 2: leads com follow_up_1 há 3+ dias (total 6 dias)
    const followUp1Due = await getFollowUpDueItems("follow_up_1", 3);
    // Pós-análise 2: receberam o PDF há 1+ dia sem resposta
    const pdfSentDue = await getFollowUpDueItems("pdf_sent", 1);
    // Pós-análise 3: receberam mensagem 2 há 2+ dias sem resposta
    const postAnalysis1Due = await getFollowUpDueItems("post_analysis_1", 2);
    // Pós-consultoria 2: consulting_done há 2+ dias sem resposta
    const consultingDoneDue = await getFollowUpDueItems("consulting_done", 2);
    // Pós-consultoria 3: post_consulting_1 há 3+ dias
    const postConsulting1Due = await getFollowUpDueItems("post_consulting_1", 3);

    const allItems = [
      ...sentDue.map((item) => ({ item, step: 1 as const, type: "gmn" as const })),
      ...followUp1Due.map((item) => ({ item, step: 2 as const, type: "gmn" as const })),
      ...pdfSentDue.map((item) => ({ item, step: 2 as const, type: "post_analysis" as const })),
      ...postAnalysis1Due.map((item) => ({
        item,
        step: 3 as const,
        type: "post_analysis" as const,
      })),
      ...consultingDoneDue.map((item) => ({
        item,
        step: 2 as const,
        type: "post_consulting" as const,
      })),
      ...postConsulting1Due.map((item) => ({
        item,
        step: 3 as const,
        type: "post_consulting" as const,
      })),
    ];

    const userIds = [...new Set(allItems.map((i) => i.item.userId))];
    const allLeads: LeadRecord[] = [];
    for (const userId of userIds) {
      const leads = await listLeads(userId);
      allLeads.push(...leads);
    }

    const leadMap = new Map(allLeads.map((l) => [l.id, l]));

    let processed = 0;
    let failed = 0;

    for (const { item, step, type } of allItems) {
      const lead = leadMap.get(item.leadId);
      if (!lead) {
        failed += 1;
        continue;
      }

      const result =
        type === "post_analysis"
          ? await processPostAnalysisFollowUp(item, lead, step as 2 | 3)
          : type === "post_consulting"
            ? await processPostConsultingFollowUp(item, lead, step as 2 | 3)
            : await processFollowUp(item, lead, step as 1 | 2);

      if (result.success) {
        processed += 1;
      } else {
        failed += 1;
        logger.warn("Follow-up falhou", { leadId: item.leadId, step, type, error: result.error });
      }
    }

    // --- Proposta follow-up (D+1, D+3, D+7) ---
    const allLeadsForFunnel = await listAllLeads();
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const proposalLeads = allLeadsForFunnel.filter(
      (l) =>
        l.stage === "Proposta" &&
        l.contactStatus !== "Respondeu" &&
        (l.proposalFollowUpStep ?? 0) < 3 &&
        l.proposalEnteredAt != null
    );

    for (const lead of proposalLeads) {
      const enteredAt = new Date(lead.proposalEnteredAt!).getTime();
      const step = (lead.proposalFollowUpStep ?? 0) as 0 | 1 | 2 | 3;
      const elapsed = now - enteredAt;

      const shouldSend =
        (step === 0 && elapsed >= 1 * DAY_MS) ||
        (step === 1 && elapsed >= 3 * DAY_MS) ||
        (step === 2 && elapsed >= 7 * DAY_MS);

      if (!shouldSend) continue;

      const queueItem = await getQueueItemByLeadId(lead.id);
      const jid = queueItem?.whatsappJid;
      if (!jid) continue;

      const nextStep = (step + 1) as 1 | 2 | 3;
      const result = await processProposalFollowUp(lead, jid, nextStep);

      if (result.success) {
        await updateLeadRecord(lead.userId, lead.id, {
          proposalFollowUpStep: nextStep,
          lastContactAt: new Date().toISOString(),
        });
        processed += 1;
        logger.info("Proposal follow-up enviado", { leadId: lead.id, step: nextStep });
      } else {
        failed += 1;
        logger.warn("Proposal follow-up falhou", {
          leadId: lead.id,
          step: nextStep,
          error: result.error,
        });
      }
    }

    // --- Reativação de leads Perdidos (D+30) ---
    const lostLeads = allLeadsForFunnel.filter(
      (l) => l.stage === "Perdido" && l.reactivationSentAt == null
    );

    for (const lead of lostLeads) {
      const referenceDate = lead.lastContactAt ?? lead.createdAt;
      const elapsed = now - new Date(referenceDate).getTime();
      if (elapsed < 30 * DAY_MS) continue;

      const queueItem = await getQueueItemByLeadId(lead.id);
      const jid = queueItem?.whatsappJid;
      if (!jid) continue;

      const result = await processReactivation(lead, jid);

      if (result.success) {
        await updateLeadRecord(lead.userId, lead.id, {
          reactivationSentAt: new Date().toISOString(),
        });
        processed += 1;
        logger.info("Reativacao enviada", { leadId: lead.id });
      } else {
        failed += 1;
        logger.warn("Reativacao falhou", { leadId: lead.id, error: result.error });
      }
    }

    if (processed === 0 && failed === 0) {
      return NextResponse.json({ processed: 0, message: "Nenhum follow-up pendente" });
    }

    return NextResponse.json({ processed, failed, total: allItems.length });
  } catch (error) {
    logger.error("Follow-up process error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
