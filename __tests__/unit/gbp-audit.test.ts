import { describe, expect, it } from "vitest";

import { extractGbpAuditData } from "@/lib/pdf/extract-audit-data";
import { generateGbpAuditPdf } from "@/lib/pdf/gbp-audit-pdf";
import type { LeadRecord } from "@/types/prospecting";

const sampleLead: LeadRecord = {
  id: "lead-gmn-1",
  userId: "user-1",
  company: "Clinica Aurora",
  niche: "Estetica premium",
  region: "Sao Paulo, SP",
  monthlyBudget: "R$ 10k",
  contact: "https://clinicaaurora.com.br",
  trigger: "Perfil com nota 4.8 e 256 avaliacao(oes) no Google.",
  stage: "Novo",
  score: 82,
  priority: "Alta",
  message: "",
  contactStatus: "Pendente",
  createdAt: "2026-03-28T00:00:00.000Z",
  source: "Google Meu Negócio",
  icp: "Clinicas esteticas premium",
};

// --- extractGbpAuditData ---

describe("extractGbpAuditData", () => {
  it("extracts rating from trigger text", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.rating).toBe(4.8);
  });

  it("extracts review count from trigger text", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.reviewCount).toBe(256);
  });

  it("detects website from contact URL", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.hasWebsite).toBe(true);
    expect(data.websiteUrl).toBe("https://clinicaaurora.com.br");
  });

  it("sets company name and address", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.companyName).toBe("Clinica Aurora");
    expect(data.address).toBe("Sao Paulo, SP");
  });

  it("uses lead score as overallScore", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.overallScore).toBe(82);
  });

  it("estimates photo count based on reviews", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.photoEstimate).toBe("Muitos"); // 256 reviews → Muitos
  });

  it("estimates category optimization", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.categoryOptimization).toBe("Otimizada"); // 4.8 rating + 256 reviews
  });

  it("generates improvements array", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.improvements.length).toBeGreaterThan(0);
    expect(data.improvements.every((i) => i.area && i.recommendation && i.impact)).toBe(true);
  });

  it("generates competitor insights array", () => {
    const data = extractGbpAuditData(sampleLead);
    expect(data.competitors).toHaveLength(3);
    expect(data.competitors[0].metric).toBe("Nota média");
  });

  it("handles lead without rating in trigger", () => {
    const lead = { ...sampleLead, trigger: "Lead encontrado via Google Meu Negócio." };
    const data = extractGbpAuditData(lead);
    expect(data.rating).toBe(0);
    expect(data.reviewCount).toBe(0);
    expect(data.photoEstimate).toBe("Desconhecido");
  });

  it("handles lead with phone as contact", () => {
    const lead = { ...sampleLead, contact: "+55 11 99999-0000" };
    const data = extractGbpAuditData(lead);
    expect(data.hasWebsite).toBe(false);
    expect(data.phoneNumber).toBe("+55 11 99999-0000");
  });
});

// --- generateGbpAuditPdf ---

describe("generateGbpAuditPdf", () => {
  it("generates a non-empty PDF buffer", async () => {
    const data = extractGbpAuditData(sampleLead);
    const buffer = await generateGbpAuditPdf({
      data,
      blurredFields: ["improvements", "competitors", "responseRate", "categoryOptimization"],
      brandName: "Prospect Hunter",
      brandColor: "#a04b2c",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("PDF starts with valid PDF header", async () => {
    const data = extractGbpAuditData(sampleLead);
    const buffer = await generateGbpAuditPdf({
      data,
      blurredFields: ["improvements", "competitors"],
      brandName: "Prospect Hunter",
      brandColor: "#a04b2c",
    });

    const header = buffer.subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  });

  it("generates PDF without blurred fields (full report)", async () => {
    const data = extractGbpAuditData(sampleLead);
    const buffer = await generateGbpAuditPdf({
      data,
      blurredFields: [],
      brandName: "Prospect Hunter",
      brandColor: "#a04b2c",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("generates PDF for lead with minimal data", async () => {
    const minimalLead = {
      ...sampleLead,
      trigger: "Lead encontrado via Google.",
      contact: "Sem contato publico",
      score: 55,
    };
    const data = extractGbpAuditData(minimalLead);
    const buffer = await generateGbpAuditPdf({
      data,
      blurredFields: ["improvements", "competitors", "responseRate", "categoryOptimization"],
      brandName: "Minha Agencia",
      brandColor: "#2563eb",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
  });
});
