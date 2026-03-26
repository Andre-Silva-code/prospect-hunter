import { generateOutreachMessage } from "@/lib/outreach-message";
import type { LeadPriority, LeadRecord } from "@/types/prospecting";

export type GenerateGeminiMessageInput = {
  userId?: string;
  company: string;
  niche: string;
  region: string;
  trigger: string;
  priority: LeadPriority;
};

export type GenerateGeminiMessageResult = {
  message: string;
  provider: "gemini" | "fallback";
  cached?: boolean;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
const GEMINI_BASE_URL =
  process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_TIMEOUT_MS = parseIntegerEnv("GEMINI_TIMEOUT_MS", 30000);
const GEMINI_CACHE_TTL_MS = parseIntegerEnv("GEMINI_CACHE_TTL_MS", 15 * 60 * 1000);
const GEMINI_MAX_RETRIES = parseIntegerEnv("GEMINI_MAX_RETRIES", 2);
const GEMINI_BACKOFF_MS = parseBackoffMs(
  process.env.GEMINI_BACKOFF_MS,
  GEMINI_MAX_RETRIES,
  [500, 1500, 3000]
);

const messageCache = new Map<string, { message: string; expiresAt: number }>();

export function __resetGeminiMessageCacheForTests(): void {
  messageCache.clear();
}

export async function generateGeminiOutreachMessage(
  input: GenerateGeminiMessageInput
): Promise<GenerateGeminiMessageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallbackMessage = generateFallbackMessage(input);
  const cacheKey = buildCacheKey(input);

  const cached = messageCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { message: cached.message, provider: "gemini", cached: true };
  }
  if (cached && cached.expiresAt <= Date.now()) {
    messageCache.delete(cacheKey);
  }

  if (!apiKey) {
    return { message: fallbackMessage, provider: "fallback" };
  }

  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${GEMINI_BASE_URL}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(input) }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 180,
            },
          }),
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < GEMINI_MAX_RETRIES - 1) {
          await sleep(
            GEMINI_BACKOFF_MS[attempt] ?? GEMINI_BACKOFF_MS[GEMINI_BACKOFF_MS.length - 1]
          );
          continue;
        }
        return { message: fallbackMessage, provider: "fallback" };
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const firstText = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      const validated = normalizeMessage(firstText);
      if (!validated) {
        return { message: fallbackMessage, provider: "fallback" };
      }

      messageCache.set(cacheKey, {
        message: validated,
        expiresAt: Date.now() + GEMINI_CACHE_TTL_MS,
      });

      return { message: validated, provider: "gemini" };
    } catch {
      if (attempt < GEMINI_MAX_RETRIES - 1) {
        await sleep(GEMINI_BACKOFF_MS[attempt] ?? GEMINI_BACKOFF_MS[GEMINI_BACKOFF_MS.length - 1]);
        continue;
      }
      return { message: fallbackMessage, provider: "fallback" };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  return { message: fallbackMessage, provider: "fallback" };
}

function buildPrompt(input: GenerateGeminiMessageInput): string {
  return [
    "Você é um SDR de uma agência de tráfego pago.",
    "Gere uma mensagem curta para primeiro contato comercial.",
    "Use português do Brasil, tom profissional e direto, sem spam.",
    "Objetivo: abrir conversa para diagnóstico em 15 minutos.",
    "Regras:",
    "- 140 a 220 caracteres.",
    "- Não use emoji.",
    "- Não invente dados.",
    "- Foco no contexto real do lead.",
    "",
    "Dados do lead:",
    `Empresa: ${sanitize(input.company)}`,
    `Nicho: ${sanitize(input.niche)}`,
    `Região: ${sanitize(input.region)}`,
    `Prioridade: ${sanitize(input.priority)}`,
    `Sinal de interesse: ${sanitize(input.trigger)}`,
    "",
    "Retorne apenas a mensagem final.",
  ].join("\n");
}

function sanitize(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>`{}[\]]/g, "")
    .replace(/(ignore previous|system prompt|developer prompt|assistant:|user:)/gi, "")
    .trim();
}

function normalizeMessage(value: string): string | null {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (clean.length > 250) return clean.slice(0, 247).trimEnd() + "...";
  return clean;
}

function generateFallbackMessage(input: GenerateGeminiMessageInput): string {
  const lead: LeadRecord = {
    id: "fallback",
    userId: "fallback",
    company: input.company,
    niche: input.niche,
    region: input.region,
    monthlyBudget: "R$ 7k",
    contact: "Sem contato público",
    trigger: input.trigger,
    stage: "Novo",
    score: 70,
    priority: input.priority,
    message: "",
    contactStatus: "Pendente",
    createdAt: new Date(0).toISOString(),
  };
  return generateOutreachMessage(lead);
}

function buildCacheKey(input: GenerateGeminiMessageInput): string {
  const normalized = [
    input.userId ?? "anonymous",
    sanitize(input.company).toLowerCase(),
    sanitize(input.niche).toLowerCase(),
    sanitize(input.region).toLowerCase(),
    sanitize(input.trigger).toLowerCase(),
    sanitize(input.priority).toLowerCase(),
  ].join("|");

  return `gemini:message:${hash(normalized)}`;
}

function hash(input: string): string {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value << 5) - value + input.charCodeAt(index);
    value |= 0;
  }
  return Math.abs(value).toString(16);
}

function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseBackoffMs(raw: string | undefined, maxRetries: number, fallback: number[]): number[] {
  if (!raw) {
    return fallback.slice(0, maxRetries);
  }

  const parsed = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .map((value) => Math.floor(value));

  if (parsed.length === 0) {
    return fallback.slice(0, maxRetries);
  }

  if (parsed.length >= maxRetries) {
    return parsed.slice(0, maxRetries);
  }

  const last = parsed[parsed.length - 1];
  while (parsed.length < maxRetries) {
    parsed.push(last);
  }

  return parsed;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
