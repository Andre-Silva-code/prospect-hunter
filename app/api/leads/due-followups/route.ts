import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { getFollowUpsDue } from "@/lib/followup";
import type { FollowUpAction } from "@/lib/followup";
import { listLeads } from "@/lib/leads-repository";

export async function GET(): Promise<NextResponse<FollowUpAction[] | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await listLeads(sessionUser.id);
  const dueFollowUps = getFollowUpsDue(leads);

  return NextResponse.json(dueFollowUps);
}
