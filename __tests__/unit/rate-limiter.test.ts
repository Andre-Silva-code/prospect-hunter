import { afterEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  resetAllRateLimits,
  checkApifyRateLimit,
  checkGeminiRateLimit,
} from "@/lib/rate-limiter";

// Força fallback em memória nos testes (sem Supabase)
process.env.USE_LOCAL_STORAGE = "true";

describe("rate limiter", () => {
  afterEach(() => {
    resetAllRateLimits();
  });

  it("allows requests within the limit", async () => {
    const config = { maxRequests: 3, windowMs: 60000 };

    expect((await checkRateLimit("test", config)).allowed).toBe(true);
    expect((await checkRateLimit("test", config)).allowed).toBe(true);
    expect((await checkRateLimit("test", config)).allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", async () => {
    const config = { maxRequests: 2, windowMs: 60000 };

    await checkRateLimit("test", config);
    await checkRateLimit("test", config);

    const result = await checkRateLimit("test", config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates different keys", async () => {
    const config = { maxRequests: 1, windowMs: 60000 };

    await checkRateLimit("user-a", config);
    const resultA = await checkRateLimit("user-a", config);
    const resultB = await checkRateLimit("user-b", config);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it("allows requests after window expires", async () => {
    const config = { maxRequests: 1, windowMs: 1 };

    await checkRateLimit("test", config);

    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        const result = await checkRateLimit("test", config);
        expect(result.allowed).toBe(true);
        resolve();
      }, 10);
    });
  });

  it("provides convenience functions for Apify and Gemini", async () => {
    const apifyResult = await checkApifyRateLimit("user-1");
    expect(apifyResult.allowed).toBe(true);

    const geminiResult = await checkGeminiRateLimit("user-1");
    expect(geminiResult.allowed).toBe(true);
  });
});
