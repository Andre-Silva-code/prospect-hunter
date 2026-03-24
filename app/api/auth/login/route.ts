import { NextResponse } from "next/server";

import { createSessionFromPassword } from "@/lib/auth-session";

export async function POST(
  request: Request
): Promise<NextResponse<{ success: true } | { error: string }>> {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
  }

  const result = await createSessionFromPassword(email, password);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
