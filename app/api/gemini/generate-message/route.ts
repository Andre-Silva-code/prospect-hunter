import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { generateGeminiOutreachMessage } from "@/lib/gemini-client";
import type { LeadPriority } from "@/types/prospecting";

type Payload = {
  company?: string;
  niche?: string;
  region?: string;
  trigger?: string;
  priority?: LeadPriority;
};

const VALID_PRIORITIES: LeadPriority[] = ["Alta", "Media", "Baixa"];

export async function POST(
  request: Request
): Promise<NextResponse<{ message: string; provider: "gemini" | "fallback" } | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (
    !payload.company ||
    !payload.niche ||
    !payload.region ||
    !payload.trigger ||
    !payload.priority ||
    !VALID_PRIORITIES.includes(payload.priority)
  ) {
    return NextResponse.json({ error: "Parametros invalidos" }, { status: 400 });
  }

  const result = await generateGeminiOutreachMessage({
    userId: sessionUser.id,
    company: payload.company,
    niche: payload.niche,
    region: payload.region,
    trigger: payload.trigger,
    priority: payload.priority,
  });

  return NextResponse.json(result);
}
