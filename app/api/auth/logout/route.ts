import { NextResponse } from "next/server";

import { clearSessionUser } from "@/lib/auth-session";

export async function POST(): Promise<NextResponse<{ success: true }>> {
  await clearSessionUser();
  return NextResponse.json({ success: true });
}
