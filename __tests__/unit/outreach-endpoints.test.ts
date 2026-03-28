import { describe, expect, it } from "vitest";

/**
 * Testes estruturais para as API routes de outreach.
 * Verificam que os módulos exportam os handlers corretos.
 * Testes de integração completos requerem mocks de auth e fetch.
 */

describe("outreach API routes", () => {
  it("process route exports POST handler", async () => {
    const mod = await import("@/app/api/outreach/process/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("follow-up route exports POST handler", async () => {
    const mod = await import("@/app/api/outreach/follow-up/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("webhook route exports POST handler", async () => {
    const mod = await import("@/app/api/outreach/webhook/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("status route exports GET handler", async () => {
    const mod = await import("@/app/api/outreach/status/route");
    expect(typeof mod.GET).toBe("function");
  });
});

describe("outreach-queue-helpers", () => {
  it("listAllOutreachItems is exported", async () => {
    const mod = await import("@/lib/outreach-queue-helpers");
    expect(typeof mod.listAllOutreachItems).toBe("function");
  });
});
