import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { normalizePhoneForWhatsApp } from "@/lib/connectors/utils";
import { UazapiNumberCheckSchema, UazapiSendResponseSchema } from "@/lib/connectors/types";
import { checkUazapiRateLimit, resetAllRateLimits } from "@/lib/rate-limiter";

// --- Phone normalization ---

describe("normalizePhoneForWhatsApp", () => {
  it("normalizes (11) 98765-4321 to 5511987654321", () => {
    expect(normalizePhoneForWhatsApp("(11) 98765-4321")).toBe("5511987654321");
  });

  it("normalizes +55 11 98765-4321 to 5511987654321", () => {
    expect(normalizePhoneForWhatsApp("+55 11 98765-4321")).toBe("5511987654321");
  });

  it("normalizes 11987654321 to 5511987654321", () => {
    expect(normalizePhoneForWhatsApp("11987654321")).toBe("5511987654321");
  });

  it("normalizes +5511987654321 to 5511987654321", () => {
    expect(normalizePhoneForWhatsApp("+5511987654321")).toBe("5511987654321");
  });

  it("handles landline with 10 digits (DDD + 8 digitos)", () => {
    expect(normalizePhoneForWhatsApp("1134567890")).toBe("551134567890");
  });

  it("returns null for numbers without DDD (8-9 digits only)", () => {
    expect(normalizePhoneForWhatsApp("987654321")).toBeNull();
    expect(normalizePhoneForWhatsApp("34567890")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizePhoneForWhatsApp("")).toBeNull();
  });

  it("returns null for non-numeric garbage", () => {
    expect(normalizePhoneForWhatsApp("Sem contato publico")).toBeNull();
  });

  it("returns null for numbers that are too long", () => {
    expect(normalizePhoneForWhatsApp("55119876543210000")).toBeNull();
  });

  it("strips all formatting characters", () => {
    expect(normalizePhoneForWhatsApp("+55 (21) 99876-5432")).toBe("5521998765432");
  });
});

// --- Zod schemas ---

describe("UazapiNumberCheckSchema", () => {
  it("parses valid response with jid", () => {
    const result = UazapiNumberCheckSchema.safeParse({
      exists: true,
      jid: "5511987654321@s.whatsapp.net",
      number: "5511987654321",
    });
    expect(result.success).toBe(true);
    expect(result.data?.exists).toBe(true);
    expect(result.data?.jid).toBe("5511987654321@s.whatsapp.net");
  });

  it("parses response when number does not exist", () => {
    const result = UazapiNumberCheckSchema.safeParse({
      exists: false,
    });
    expect(result.success).toBe(true);
    expect(result.data?.exists).toBe(false);
  });

  it("rejects response without exists field", () => {
    const result = UazapiNumberCheckSchema.safeParse({
      jid: "5511987654321@s.whatsapp.net",
    });
    expect(result.success).toBe(false);
  });
});

describe("UazapiSendResponseSchema", () => {
  it("parses successful send response", () => {
    const result = UazapiSendResponseSchema.safeParse({
      messageId: "msg-abc-123",
      status: "sent",
    });
    expect(result.success).toBe(true);
    expect(result.data?.messageId).toBe("msg-abc-123");
  });

  it("parses error response", () => {
    const result = UazapiSendResponseSchema.safeParse({
      error: "Number not found on WhatsApp",
    });
    expect(result.success).toBe(true);
    expect(result.data?.error).toBe("Number not found on WhatsApp");
  });

  it("parses empty response (all fields optional)", () => {
    const result = UazapiSendResponseSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// --- Rate limiter ---

describe("checkUazapiRateLimit", () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  afterEach(() => {
    resetAllRateLimits();
  });

  it("allows first request", () => {
    const result = checkUazapiRateLimit("user-1");
    expect(result.allowed).toBe(true);
  });

  it("blocks after exceeding limit", () => {
    for (let i = 0; i < 10; i++) {
      checkUazapiRateLimit("user-2");
    }
    const result = checkUazapiRateLimit("user-2");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates users", () => {
    for (let i = 0; i < 10; i++) {
      checkUazapiRateLimit("user-a");
    }
    const resultA = checkUazapiRateLimit("user-a");
    const resultB = checkUazapiRateLimit("user-b");
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });
});

// --- Uazapi client functions (with mocked fetch) ---

describe("uazapi client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      UAZAPI_API_URL: "https://api.uazapi.test",
      UAZAPI_API_TOKEN: "test-token",
      UAZAPI_INSTANCE_ID: "test-instance",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("checkWhatsAppNumber returns exists: true when API confirms", async () => {
    const { checkWhatsAppNumber } = await import("@/lib/connectors/uazapi");

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        exists: true,
        jid: "5511987654321@s.whatsapp.net",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkWhatsAppNumber("(11) 98765-4321");
    expect(result.exists).toBe(true);
    expect(result.jid).toBe("5511987654321@s.whatsapp.net");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/instance/test-instance/instance/checkNumber"
    );
  });

  it("checkWhatsAppNumber returns exists: false for invalid phone", async () => {
    const { checkWhatsAppNumber } = await import("@/lib/connectors/uazapi");

    const result = await checkWhatsAppNumber("Sem contato publico");
    expect(result.exists).toBe(false);
    expect(result.jid).toBeNull();
  });

  it("sendTextMessage calls correct endpoint", async () => {
    const { sendTextMessage } = await import("@/lib/connectors/uazapi");

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        messageId: "msg-123",
        status: "sent",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTextMessage("5511987654321@s.whatsapp.net", "Ola!");
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-123");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/message/sendText");
  });

  it("sendDocumentMessage sends PDF with caption", async () => {
    const { sendDocumentMessage } = await import("@/lib/connectors/uazapi");

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        messageId: "msg-pdf-456",
        status: "sent",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendDocumentMessage(
      "5511987654321@s.whatsapp.net",
      "Segue o relatorio de analise!",
      "base64pdfcontent",
      "analise-gmn.pdf"
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-pdf-456");

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.document).toBe("base64pdfcontent");
    expect(body.fileName).toBe("analise-gmn.pdf");
    expect(body.mimetype).toBe("application/pdf");
  });

  it("handles API error gracefully", async () => {
    const { sendTextMessage } = await import("@/lib/connectors/uazapi");

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTextMessage("5511987654321@s.whatsapp.net", "Teste");
    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });
});
