import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { advanceFollowUp, scheduleFirstFollowUp } from "@/lib/followup";
import { logger } from "@/lib/logger";
import { listLeads, updateLeadRecord } from "@/lib/leads-repository";
import type { LeadRecord } from "@/types/prospecting";

export async function POST(
  _request: Request,
  context: { params: Promise<{ leadId: string }> }
): Promise<NextResponse<LeadRecord | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await context.params;
  const leads = await listLeads(sessionUser.id);
  const lead = leads.find((l) => l.id === leadId);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const updates =
    lead.followUpStep === undefined || lead.followUpStep === 0
      ? scheduleFirstFollowUp(lead)
      : advanceFollowUp(lead);

  const updatedLead = await updateLeadRecord(sessionUser.id, leadId, updates);
  if (!updatedLead) {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }

  logger.info("Follow-up contact recorded", {
    userId: sessionUser.id,
    leadId,
    step: updatedLead.followUpStep,
    nextFollowUpAt: updatedLead.nextFollowUpAt,
  });

  return NextResponse.json(updatedLead);
}
