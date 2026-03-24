import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { updateLeadRecord } from "@/lib/leads-repository";
import type { LeadRecord } from "@/types/prospecting";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
): Promise<NextResponse<LeadRecord | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await context.params;
  let updates: Partial<LeadRecord>;
  try {
    updates = (await request.json()) as Partial<LeadRecord>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const updatedLead = await updateLeadRecord(sessionUser.id, leadId, updates);

  if (!updatedLead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(updatedLead);
}
