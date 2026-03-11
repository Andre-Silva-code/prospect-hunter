import { describe, expect, it } from "vitest";

import { generateOutreachMessage } from "@/lib/outreach-message";

describe("generateOutreachMessage", () => {
  it("builds a personalized outreach message from lead data", () => {
    const message = generateOutreachMessage({
      id: "lead-1",
      userId: "owner",
      company: "Clinica Alpha",
      niche: "Estetica premium",
      region: "Sao Paulo",
      monthlyBudget: "R$ 12k",
      contact: "instagram @alpha",
      trigger: "Anuncio ativo e funil simples",
      stage: "Novo",
      score: 90,
      priority: "Alta",
      message: "",
      contactStatus: "Pendente",
      createdAt: "2026-03-10T00:00:00.000Z",
    });

    expect(message).toContain("Clinica Alpha");
    expect(message).toContain("Sao Paulo");
    expect(message).toContain("Anuncio ativo e funil simples");
  });
});
