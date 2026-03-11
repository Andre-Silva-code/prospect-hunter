import { NextResponse } from "next/server";

import { createLead, listLeads } from "@/lib/leads-repository";
import type { LeadRecord } from "@/types/prospecting";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? "owner";
}

export async function GET(request: Request): Promise<NextResponse<LeadRecord[]>> {
  const leads = await listLeads(getUserId(request));
  return NextResponse.json(leads);
}

export async function POST(
  request: Request
): Promise<NextResponse<LeadRecord | { error: string }>> {
  const lead = (await request.json()) as LeadRecord;
  const userId = getUserId(request);
  const createdLead = await createLead(userId, { ...lead, userId });

  return NextResponse.json(createdLead, { status: 201 });
}
