import { NextResponse } from "next/server";

import { updateLeadRecord } from "@/lib/leads-repository";
import type { LeadRecord } from "@/types/prospecting";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? "owner";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
): Promise<NextResponse<LeadRecord | { error: string }>> {
  const { leadId } = await context.params;
  const updates = (await request.json()) as Partial<LeadRecord>;
  const updatedLead = await updateLeadRecord(getUserId(request), leadId, updates);

  if (!updatedLead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(updatedLead);
}
