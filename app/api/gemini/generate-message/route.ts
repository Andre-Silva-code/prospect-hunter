import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { generateGeminiOutreachMessage } from "@/lib/gemini-client";
import { logger } from "@/lib/logger";
import { checkGeminiRateLimit } from "@/lib/rate-limiter";
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

  const rateCheck = await checkGeminiRateLimit(sessionUser.id);
  if (!rateCheck.allowed) {
    logger.warn("Rate limit exceeded for Gemini message generation", {
      userId: sessionUser.id,
      retryAfterMs: rateCheck.retryAfterMs,
    });
    return NextResponse.json(
      {
        error: `Limite de mensagens excedido. Tente novamente em ${Math.ceil(rateCheck.retryAfterMs / 1000)}s.`,
      },
      { status: 429 }
    );
  }

  const result = await generateGeminiOutreachMessage({
    userId: sessionUser.id,
    company: payload.company,
    niche: payload.niche,
    region: payload.region,
    trigger: payload.trigger,
    priority: payload.priority,
  });

  logger.info("Gemini message generated", {
    userId: sessionUser.id,
    provider: result.provider,
    company: payload.company,
  });

  return NextResponse.json(result);
}
