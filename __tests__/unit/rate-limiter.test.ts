import { afterEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  resetAllRateLimits,
  checkApifyRateLimit,
  checkGeminiRateLimit,
} from "@/lib/rate-limiter";

describe("rate limiter", () => {
  afterEach(() => {
    resetAllRateLimits();
  });

  it("allows requests within the limit", () => {
    const config = { maxRequests: 3, windowMs: 60000 };

    expect(checkRateLimit("test", config).allowed).toBe(true);
    expect(checkRateLimit("test", config).allowed).toBe(true);
    expect(checkRateLimit("test", config).allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    const config = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit("test", config);
    checkRateLimit("test", config);

    const result = checkRateLimit("test", config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates different keys", () => {
    const config = { maxRequests: 1, windowMs: 60000 };

    checkRateLimit("user-a", config);
    const resultA = checkRateLimit("user-a", config);
    const resultB = checkRateLimit("user-b", config);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it("allows requests after window expires", () => {
    const config = { maxRequests: 1, windowMs: 1 };

    checkRateLimit("test", config);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = checkRateLimit("test", config);
        expect(result.allowed).toBe(true);
        resolve();
      }, 10);
    });
  });

  it("provides convenience functions for Apify and Gemini", () => {
    const apifyResult = checkApifyRateLimit("user-1");
    expect(apifyResult.allowed).toBe(true);

    const geminiResult = checkGeminiRateLimit("user-1");
    expect(geminiResult.allowed).toBe(true);
  });
});
