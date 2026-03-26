import { generateOutreachMessage } from "@/lib/outreach-message";
import type { LeadPriority, LeadRecord } from "@/types/prospecting";

export type GenerateGeminiMessageInput = {
  company: string;
  niche: string;
  region: string;
  trigger: string;
  priority: LeadPriority;
};

export type GenerateGeminiMessageResult = {
  message: string;
  provider: "gemini" | "fallback";
};

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
const GEMINI_BASE_URL =
  process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";

export async function generateGeminiOutreachMessage(
  input: GenerateGeminiMessageInput
): Promise<GenerateGeminiMessageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallbackMessage = generateFallbackMessage(input);

  if (!apiKey) {
    return { message: fallbackMessage, provider: "fallback" };
  }

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
      }
    );

    if (!response.ok) {
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

    return { message: validated, provider: "gemini" };
  } catch {
    return { message: fallbackMessage, provider: "fallback" };
  }
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
  return value.replace(/\s+/g, " ").replace(/[<>`]/g, "").trim();
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
