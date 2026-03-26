import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateGeminiOutreachMessage } from "@/lib/gemini-client";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function createResponse(ok: boolean, status: number, payload: unknown): Response {
  const response: MockResponse = {
    ok,
    status,
    json: async () => payload,
  };
  return response as unknown as Response;
}

describe("gemini-client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses fallback when GEMINI_API_KEY is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateGeminiOutreachMessage({
      company: "Clinica Aurora",
      niche: "Estetica",
      region: "Sao Paulo",
      trigger: "Anuncios ativos",
      priority: "Alta",
    });

    expect(result.provider).toBe("fallback");
    expect(result.message).toContain("Clinica Aurora");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns Gemini message when API responds with valid content", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, {
        candidates: [
          {
            content: {
              parts: [{ text: "Oi, time da Clinica Aurora. Posso te mostrar em 15 minutos..." }],
            },
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateGeminiOutreachMessage({
      company: "Clinica Aurora",
      niche: "Estetica",
      region: "Sao Paulo",
      trigger: "Anuncios ativos",
      priority: "Alta",
    });

    expect(result.provider).toBe("gemini");
    expect(result.message).toContain("Clinica Aurora");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back when Gemini API returns a non-2xx response", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(createResponse(false, 503, {}));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateGeminiOutreachMessage({
      company: "Clinica Aurora",
      niche: "Estetica",
      region: "Sao Paulo",
      trigger: "Anuncios ativos",
      priority: "Alta",
    });

    expect(result.provider).toBe("fallback");
    expect(result.message).toContain("Clinica Aurora");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
