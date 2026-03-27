import { describe, expect, it } from "vitest";

import { calculateMetrics } from "@/lib/analytics";
import type { LeadRecord } from "@/types/prospecting";

function buildLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    userId: "user-1",
    company: "Test Lead",
    niche: "Estetica",
    region: "Sao Paulo",
    monthlyBudget: "R$ 10k",
    contact: "@test",
    trigger: "Anuncio ativo",
    stage: "Novo",
    score: 80,
    priority: "Alta",
    message: "Msg",
    contactStatus: "Pendente",
    createdAt: "2026-03-25T00:00:00.000Z",
    source: "Instagram",
    ...overrides,
  };
}

describe("calculateMetrics", () => {
  const now = new Date("2026-03-26T12:00:00.000Z");

  it("returns zero metrics for empty leads", () => {
    const metrics = calculateMetrics([], now);

    expect(metrics.totalLeads).toBe(0);
    expect(metrics.responseRate).toBe(0);
    expect(metrics.conversionRate).toBe(0);
    expect(metrics.avgScore).toBe(0);
  });

  it("counts leads by stage", () => {
    const leads = [
      buildLead({ id: "1", stage: "Novo" }),
      buildLead({ id: "2", stage: "Novo" }),
      buildLead({ id: "3", stage: "Contato" }),
      buildLead({ id: "4", stage: "Fechado" }),
    ];

    const metrics = calculateMetrics(leads, now);

    expect(metrics.leadsByStage["Novo"]).toBe(2);
    expect(metrics.leadsByStage["Contato"]).toBe(1);
    expect(metrics.leadsByStage["Fechado"]).toBe(1);
    expect(metrics.leadsByStage["Perdido"]).toBe(0);
  });

  it("counts leads by source", () => {
    const leads = [
      buildLead({ id: "1", source: "Instagram" }),
      buildLead({ id: "2", source: "Instagram" }),
      buildLead({ id: "3", source: "LinkedIn" }),
    ];

    const metrics = calculateMetrics(leads, now);

    expect(metrics.leadsBySource["Instagram"]).toBe(2);
    expect(metrics.leadsBySource["LinkedIn"]).toBe(1);
  });

  it("calculates response rate from contacted leads", () => {
    const leads = [
      buildLead({ id: "1", contactStatus: "Mensagem enviada" }),
      buildLead({ id: "2", contactStatus: "Respondeu" }),
      buildLead({ id: "3", contactStatus: "Pendente" }),
    ];

    const metrics = calculateMetrics(leads, now);

    expect(metrics.responseRate).toBe(0.5);
  });

  it("calculates conversion rate", () => {
    const leads = [
      buildLead({ id: "1", stage: "Fechado" }),
      buildLead({ id: "2", stage: "Novo" }),
      buildLead({ id: "3", stage: "Perdido" }),
      buildLead({ id: "4", stage: "Contato" }),
    ];

    const metrics = calculateMetrics(leads, now);

    expect(metrics.conversionRate).toBe(0.25);
  });

  it("calculates average score", () => {
    const leads = [
      buildLead({ id: "1", score: 60 }),
      buildLead({ id: "2", score: 80 }),
      buildLead({ id: "3", score: 100 }),
    ];

    const metrics = calculateMetrics(leads, now);

    expect(metrics.avgScore).toBe(80);
  });

  it("counts overdue and pending follow-ups", () => {
    const leads = [
      buildLead({ id: "1", nextFollowUpAt: "2026-03-25T00:00:00.000Z" }),
      buildLead({ id: "2", nextFollowUpAt: "2026-03-27T00:00:00.000Z" }),
      buildLead({ id: "3", nextFollowUpAt: null }),
      buildLead({ id: "4", stage: "Fechado", nextFollowUpAt: "2026-03-25T00:00:00.000Z" }),
    ];

    const metrics = calculateMetrics(leads, now);

    expect(metrics.followUpsOverdue).toBe(1);
    expect(metrics.followUpsPending).toBe(1);
  });

  it("counts leads created this week", () => {
    const leads = [
      buildLead({ id: "1", createdAt: "2026-03-25T00:00:00.000Z" }),
      buildLead({ id: "2", createdAt: "2026-03-10T00:00:00.000Z" }),
    ];

    const metrics = calculateMetrics(leads, now);

    expect(metrics.leadsThisWeek).toBe(1);
  });
});
