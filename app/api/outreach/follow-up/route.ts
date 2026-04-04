import { NextResponse } from "next/server";

import { getFollowUpDueItems } from "@/lib/outreach-queue";
import { listLeads } from "@/lib/leads-repository";
import { processFollowUp, processPostAnalysisFollowUp } from "@/lib/outreach-orchestrator";
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

    const allItems = [
      ...sentDue.map((item) => ({ item, step: 1 as const, type: "gmn" as const })),
      ...followUp1Due.map((item) => ({ item, step: 2 as const, type: "gmn" as const })),
      ...pdfSentDue.map((item) => ({ item, step: 2 as const, type: "post_analysis" as const })),
      ...postAnalysis1Due.map((item) => ({
        item,
        step: 3 as const,
        type: "post_analysis" as const,
      })),
    ];

    if (allItems.length === 0) {
      return NextResponse.json({ processed: 0, message: "Nenhum follow-up pendente" });
    }

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
          : await processFollowUp(item, lead, step as 1 | 2);

      if (result.success) {
        processed += 1;
      } else {
        failed += 1;
        logger.warn("Follow-up falhou", { leadId: item.leadId, step, type, error: result.error });
      }
    }

    return NextResponse.json({ processed, failed, total: allItems.length });
  } catch (error) {
    logger.error("Follow-up process error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
