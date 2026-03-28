import { UazapiNumberCheckSchema, UazapiSendResponseSchema } from "./types";
import { fetchWithTimeout, isAbortError, normalizePhoneForWhatsApp } from "./utils";

const UAZAPI_BASE_URL = process.env.UAZAPI_API_URL ?? "";
const UAZAPI_TOKEN = process.env.UAZAPI_API_TOKEN ?? "";
const UAZAPI_INSTANCE = process.env.UAZAPI_INSTANCE_ID ?? "";
const UAZAPI_TIMEOUT_MS = parseIntegerEnv("UAZAPI_TIMEOUT_MS", 15000);

export type UazapiCheckResult = {
  exists: boolean;
  jid: string | null;
};

export type UazapiSendResult = {
  success: boolean;
  messageId: string | null;
  error: string | null;
};

export function isUazapiConfigured(): boolean {
  return UAZAPI_BASE_URL.length > 0 && UAZAPI_TOKEN.length > 0 && UAZAPI_INSTANCE.length > 0;
}

/**
 * Verifica se um número de telefone está registrado no WhatsApp.
 */
export async function checkWhatsAppNumber(phone: string): Promise<UazapiCheckResult> {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return { exists: false, jid: null };

  if (!isUazapiConfigured()) {
    return { exists: false, jid: null };
  }

  try {
    const response = await uazapiFetch("/instance/checkNumber", {
      number: normalized,
    });

    if (!response.ok) {
      return { exists: false, jid: null };
    }

    const raw = (await response.json()) as unknown;
    const parsed = UazapiNumberCheckSchema.safeParse(raw);
    if (!parsed.success) return { exists: false, jid: null };

    return {
      exists: parsed.data.exists,
      jid: parsed.data.jid ?? null,
    };
  } catch {
    return { exists: false, jid: null };
  }
}

/**
 * Envia uma mensagem de texto simples via WhatsApp.
 */
export async function sendTextMessage(jid: string, text: string): Promise<UazapiSendResult> {
  if (!isUazapiConfigured()) {
    return { success: false, messageId: null, error: "Uazapi nao configurado" };
  }

  return sendMessage("/message/sendText", {
    number: jid,
    text,
  });
}

/**
 * Envia um documento (PDF) com legenda via WhatsApp.
 */
export async function sendDocumentMessage(
  jid: string,
  caption: string,
  pdfBase64: string,
  fileName: string
): Promise<UazapiSendResult> {
  if (!isUazapiConfigured()) {
    return { success: false, messageId: null, error: "Uazapi nao configurado" };
  }

  return sendMessage("/message/sendDocument", {
    number: jid,
    caption,
    document: pdfBase64,
    fileName,
    mimetype: "application/pdf",
  });
}

// --- Internal helpers ---

async function sendMessage(path: string, body: Record<string, unknown>): Promise<UazapiSendResult> {
  try {
    const response = await uazapiFetch(path, body);

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: `Uazapi indisponivel (${response.status})`,
      };
    }

    const raw = (await response.json()) as unknown;
    const parsed = UazapiSendResponseSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, messageId: null, error: "Resposta Uazapi em formato invalido" };
    }

    if (parsed.data.error) {
      return { success: false, messageId: null, error: parsed.data.error };
    }

    return {
      success: true,
      messageId: parsed.data.messageId ?? null,
      error: null,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return { success: false, messageId: null, error: "Uazapi timeout" };
    }
    return { success: false, messageId: null, error: "Falha ao conectar com Uazapi" };
  }
}

async function uazapiFetch(path: string, body: Record<string, unknown>): Promise<Response> {
  const url = `${UAZAPI_BASE_URL}/instance/${encodeURIComponent(UAZAPI_INSTANCE)}${path}`;

  return fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${UAZAPI_TOKEN}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    UAZAPI_TIMEOUT_MS
  );
}

function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}
