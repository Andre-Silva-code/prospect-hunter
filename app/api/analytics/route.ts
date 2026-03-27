import { NextResponse } from "next/server";

import { calculateMetrics } from "@/lib/analytics";
import type { DashboardMetrics } from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth-session";
import { listLeads } from "@/lib/leads-repository";

export async function GET(): Promise<NextResponse<DashboardMetrics | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await listLeads(sessionUser.id);
  const metrics = calculateMetrics(leads);

  return NextResponse.json(metrics);
}
