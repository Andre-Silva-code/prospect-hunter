import { describe, expect, it } from "vitest";

import {
  generateOutreachMessage,
  generateGmnAuditMessage,
  generateSemGmnWhatsAppMessage,
  generateSemGmnFollowUpMessage,
  generateSemGmnPostPreviewMessage,
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

describe("generateSemGmnWhatsAppMessage", () => {
  it("personaliza com empresa, região e nicho e foca em implementação (não otimização)", () => {
    const message = generateSemGmnWhatsAppMessage({
      company: "Estúdio Bella",
      region: "Campinas, São Paulo",
      niche: "estética",
    });

    expect(message).toContain("Estúdio Bella");
    expect(message).toContain("Campinas, São Paulo");
    expect(message).toContain("estética");
    // Intenção: vender a criação da ficha (não analisar uma existente)
    expect(message).toMatch(/não aparecem no Google Meu Negócio/i);
    expect(message).toMatch(/implemento a ficha completa/i);
  });
});

describe("generateSemGmnFollowUpMessage", () => {
  it("step 1 traz novo ângulo (buscas 'perto de mim')", () => {
    const msg = generateSemGmnFollowUpMessage({ company: "Estúdio Bella" }, 1);
    expect(msg).toContain("Estúdio Bella");
    expect(msg).toMatch(/perto de mim/i);
  });

  it("step 2 é uma saída limpa que preserva o relacionamento", () => {
    const msg = generateSemGmnFollowUpMessage({ company: "Estúdio Bella" }, 2);
    expect(msg).toMatch(/última passagem/i);
    expect(msg).toMatch(/mapa do Google/i);
  });
});

describe("generateSemGmnPostPreviewMessage", () => {
  it("step 1 confirma a prévia e traz o link de agenda", () => {
    const msg = generateSemGmnPostPreviewMessage({ company: "Estúdio Bella" }, 1);
    expect(msg).toMatch(/prévia/i);
    expect(msg).toContain("calendar.app.google");
  });

  it("cada step gera texto diferente", () => {
    const s1 = generateSemGmnPostPreviewMessage({ company: "X" }, 1);
    const s2 = generateSemGmnPostPreviewMessage({ company: "X" }, 2);
    const s3 = generateSemGmnPostPreviewMessage({ company: "X" }, 3);
    expect(new Set([s1, s2, s3]).size).toBe(3);
  });
});

describe("buildGbpCheckUrl", () => {
  it("builds a Google Search URL with company name and GMN qualifier", () => {
    const url = buildGbpCheckUrl("Clinica Aurora");
    expect(url).toContain("google.com/search?q=");
    expect(url).toContain("Clinica%20Aurora");
    expect(url).toContain("google%20meu%20neg");
    expect(url).not.toContain("maps");
  });

  it("includes region when provided", () => {
    const url = buildGbpCheckUrl("Clinica Aurora", "São Paulo");
    expect(url).toContain("google.com/search?q=");
    expect(url).toContain("Clinica%20Aurora");
    expect(url).toContain("S%C3%A3o%20Paulo");
    expect(url).not.toContain("maps");
  });
});
