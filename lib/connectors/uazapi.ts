import { UazapiSendResponseSchema } from "./types";
import { fetchWithTimeout, isAbortError, normalizePhoneForWhatsApp } from "./utils";

/**
 * Detecta se uma resposta/corpo da Uazapi indica instância desconectada
 * (sessão do WhatsApp caiu) em vez de um erro pontual. Nesses casos o número
 * NÃO deve ser tratado como inválido.
 */
function isDisconnectedResponse(status: number, body?: Record<string, unknown>): boolean {
  if (status === 503) return true;
  const message = typeof body?.message === "string" ? body.message.toLowerCase() : "";
  return message.includes("disconnected") || message.includes("not reconnectable");
}

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
  /**
   * true quando NÃO foi possível verificar o número porque a instância está
   * offline/indisponível (não confundir com "número não tem WhatsApp"). Nesse
   * caso o chamador NÃO deve marcar o lead como phone_invalid.
   */
  unavailable?: boolean;
};

export type UazapiSendResult = {
  success: boolean;
  messageId: string | null;
  error: string | null;
};

export type UazapiInstanceStatus = {
  configured: boolean;
  connected: boolean;
  loggedIn: boolean;
  status: string | null;
  jid: string | null;
  error: string | null;
};

export function isUazapiConfigured(): boolean {
  return getBaseUrl().length > 0 && getToken().length > 0;
}

/**
 * Consulta o status de conexão da instância do WhatsApp.
 * uazapiGO v2: GET /instance/status
 *
 * Usado para monitoração: se a sessão do WhatsApp cair (ex.: "logged out from
 * another device"), a instância fica desconectada e nenhuma mensagem sai — mas
 * as verificações de número passam a falhar silenciosamente, marcando leads como
 * phone_invalid. Esta função permite detectar a causa raiz antes disso.
 */
export async function getInstanceStatus(): Promise<UazapiInstanceStatus> {
  if (!isUazapiConfigured()) {
    return {
      configured: false,
      connected: false,
      loggedIn: false,
      status: null,
      jid: null,
      error: "Uazapi nao configurado",
    };
  }

  try {
    const response = await fetchWithTimeout(
      `${getBaseUrl()}/instance/status`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json", token: getToken() },
        cache: "no-store",
      },
      getTimeoutMs()
    );

    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        loggedIn: false,
        status: null,
        jid: null,
        error: `Uazapi indisponivel (${response.status})`,
      };
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const statusObj = (raw.status as Record<string, unknown>) ?? {};
    const instanceObj = (raw.instance as Record<string, unknown>) ?? {};

    return {
      configured: true,
      connected: statusObj.connected === true,
      loggedIn: statusObj.loggedIn === true,
      status: (instanceObj.status as string) ?? null,
      jid: (statusObj.jid as string) ?? null,
      error: null,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        configured: true,
        connected: false,
        loggedIn: false,
        status: null,
        jid: null,
        error: "Uazapi timeout",
      };
    }
    return {
      configured: true,
      connected: false,
      loggedIn: false,
      status: null,
      jid: null,
      error: "Falha ao conectar com Uazapi",
    };
  }
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
      // Distingue "instância offline" de "número não existe". Se a sessão do
      // WhatsApp caiu, sinaliza unavailable para o chamador NÃO queimar o lead
      // marcando-o como phone_invalid.
      const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (isDisconnectedResponse(response.status, errorBody)) {
        return { exists: false, jid: null, unavailable: true };
      }
      return { exists: false, jid: null };
    }

    const raw = (await response.json()) as unknown;

    // Alguns erros vêm com HTTP 200 mas corpo { error: true, message: "...disconnected" }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const body = raw as Record<string, unknown>;
      if (body.error === true && isDisconnectedResponse(200, body)) {
        return { exists: false, jid: null, unavailable: true };
      }
    }

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
