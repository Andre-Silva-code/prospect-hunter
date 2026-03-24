import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { createLead, listLeads } from "@/lib/leads-repository";
import type { LeadRecord } from "@/types/prospecting";

export async function GET(): Promise<NextResponse<LeadRecord[] | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await listLeads(sessionUser.id);
  return NextResponse.json(leads);
}

export async function POST(
  request: Request
): Promise<NextResponse<LeadRecord | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let lead: LeadRecord;
  try {
    lead = (await request.json()) as LeadRecord;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const createdLead = await createLead(sessionUser.id, { ...lead, userId: sessionUser.id });
    return NextResponse.json(createdLead, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 502 });
  }
}
