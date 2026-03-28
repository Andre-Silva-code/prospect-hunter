import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { listUserOutreach } from "@/lib/outreach-queue";

export async function GET(): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listUserOutreach(sessionUser.id);
  return NextResponse.json({ items });
}
