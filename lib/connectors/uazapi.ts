import { UazapiSendResponseSchema } from "./types";
import { fetchWithTimeout, isAbortError, normalizePhoneForWhatsApp } from "./utils";

function getBaseUrl(): string {
  return process.env.UAZAPI_API_URL ?? "";
}
function getToken(): string {
  return process.env.UAZAPI_API_TOKEN ?? "";
}
function getTimeoutMs(): number {
  return parseIntegerEnv("UAZAPI_TIMEOUT_MS", 15000);
}

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
  return getBaseUrl().length > 0 && getToken().length > 0;
}

/**
 * Verifica se um número de telefone está registrado no WhatsApp.
 * uazapiGO v2: POST /chat/check
 */
export async function checkWhatsAppNumber(phone: string): Promise<UazapiCheckResult> {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return { exists: false, jid: null };

  if (!isUazapiConfigured()) {
    return { exists: false, jid: null };
  }

  try {
    // uazapiGO v2: POST /chat/check { numbers: ["5511..."] }
    const response = await uazapiFetch("/chat/check", {
      numbers: [normalized],
    });

    if (!response.ok) {
      return { exists: false, jid: null };
    }

    const raw = (await response.json()) as unknown;

    // Resposta: [{ query, isInWhatsapp, jid, lid, verifiedName }]
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0] as Record<string, unknown>;
      return {
        exists: first.isInWhatsapp === true,
        jid: (first.jid as string) ?? null,
      };
    }

    return { exists: false, jid: null };
  } catch {
    return { exists: false, jid: null };
  }
}

/**
 * Envia uma mensagem de texto simples via WhatsApp.
 * uazapiGO v2: POST /send/text { number, text }
 */
export async function sendTextMessage(jid: string, text: string): Promise<UazapiSendResult> {
  if (!isUazapiConfigured()) {
    return { success: false, messageId: null, error: "Uazapi nao configurado" };
  }

  return sendMessage("/send/text", {
    number: jid,
    text,
  });
}

/**
 * Envia um documento (PDF) com legenda via WhatsApp.
 * uazapiGO v2: POST /send/media { number, caption, media, fileName, mediatype }
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

  return sendMessage("/send/media", {
    number: jid,
    text: caption,
    file: `data:application/pdf;base64,${pdfBase64}`,
    docName: fileName,
    type: "document",
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

    const raw = (await response.json()) as Record<string, unknown>;

    // uazapiGO v2 retorna { messageid, id, chatid, ... } em caso de sucesso
    if (raw.messageid || raw.id || raw.messageId) {
      return {
        success: true,
        messageId:
          (raw.messageid as string) ?? (raw.id as string) ?? (raw.messageId as string) ?? null,
        error: null,
      };
    }

    // Tentar parse com schema existente
    const parsed = UazapiSendResponseSchema.safeParse(raw);
    if (parsed.success) {
      if (parsed.data.error) {
        return { success: false, messageId: null, error: parsed.data.error };
      }
      return {
        success: true,
        messageId: parsed.data.messageId ?? null,
        error: null,
      };
    }

    // Se tem code de erro
    if (raw.code && (raw.code as number) >= 400) {
      return { success: false, messageId: null, error: (raw.message as string) ?? "Erro Uazapi" };
    }

    // Assumir sucesso se não houve erro explícito
    return { success: true, messageId: null, error: null };
  } catch (error) {
    if (isAbortError(error)) {
      return { success: false, messageId: null, error: "Uazapi timeout" };
    }
    return { success: false, messageId: null, error: "Falha ao conectar com Uazapi" };
  }
}

/**
 * uazapiGO v2: usa header "token" com o Instance Token.
 * Path direto na raiz: /send/text, /chat/check, etc.
 */
async function uazapiFetch(path: string, body: Record<string, unknown>): Promise<Response> {
  const url = `${getBaseUrl()}${path}`;

  return fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: getToken(),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    getTimeoutMs()
  );
}

function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}
