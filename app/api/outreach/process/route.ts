import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { getDueOutreachItems } from "@/lib/outreach-queue";
import { listLeads } from "@/lib/leads-repository";
import { processScheduledOutreach } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";
import type { LeadRecord } from "@/types/prospecting";

export async function POST(request: Request): Promise<NextResponse> {
  // Aceita autenticação por cron secret OU sessão do usuário
  const cronSecret = process.env.OUTREACH_CRON_SECRET;
  const auth = request.headers.get("authorization");
  const hasCronAuth = cronSecret && auth === `Bearer ${cronSecret}`;
  const sessionUser = await getSessionUser();

  if (!hasCronAuth && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dueItems = await getDueOutreachItems();
    if (dueItems.length === 0) {
      return NextResponse.json({ processed: 0, failed: 0, message: "Nada agendado" });
    }

    const userIds = [...new Set(dueItems.map((i) => i.userId))];
    const allLeads: LeadRecord[] = [];
    for (const userId of userIds) {
      const leads = await listLeads(userId);
      allLeads.push(...leads);
    }

    const leadMap = new Map(allLeads.map((l) => [l.id, l]));

    let processed = 0;
    let failed = 0;

    for (const item of dueItems) {
      const lead = leadMap.get(item.leadId);
      if (!lead) {
        logger.warn("Lead nao encontrado para outreach", { leadId: item.leadId });
        failed += 1;
        continue;
      }

      const result = await processScheduledOutreach(item, lead);
      if (result.success) {
        processed += 1;
      } else {
        failed += 1;
        logger.warn("Outreach falhou", { leadId: item.leadId, error: result.error });
      }
    }

    return NextResponse.json({ processed, failed, total: dueItems.length });
  } catch (error) {
    logger.error("Outreach process error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
