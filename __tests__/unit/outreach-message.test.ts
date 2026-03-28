import { describe, expect, it } from "vitest";

import {
  generateOutreachMessage,
  generateGmnAuditMessage,
  buildGbpCheckUrl,
} from "@/lib/outreach-message";

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

describe("generateGmnAuditMessage", () => {
  it("builds a GMN audit message with company, region and trigger", () => {
    const message = generateGmnAuditMessage({
      company: "Clinica Aurora",
      region: "Sao Paulo, SP",
      trigger: "Perfil com nota 4.8 e 256 avaliacao(oes) no Google.",
    });

    expect(message).toContain("Clinica Aurora");
    expect(message).toContain("Sao Paulo, SP");
    expect(message).toContain("nota 4.8");
    expect(message).toContain("análise gratuita");
  });
});

describe("buildGbpCheckUrl", () => {
  it("builds a Google Maps search URL with company name", () => {
    const url = buildGbpCheckUrl("Clinica Aurora");
    expect(url).toBe("https://www.google.com/maps/search/Clinica%20Aurora");
  });

  it("includes region when provided", () => {
    const url = buildGbpCheckUrl("Clinica Aurora", "São Paulo");
    expect(url).toBe("https://www.google.com/maps/search/Clinica%20Aurora%20S%C3%A3o%20Paulo");
  });
});
