import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";

export async function GET(): Promise<
  NextResponse<{ id: string; name: string; email: string } | null>
> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json(user);
}
