import { describe, expect, it } from "vitest";

import { advanceFollowUp, getFollowUpsDue, scheduleFirstFollowUp } from "@/lib/followup";
import type { LeadRecord } from "@/types/prospecting";

function buildLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    userId: "user-1",
    company: "Clinica Aurora",
    niche: "Estetica",
    region: "Sao Paulo",
    monthlyBudget: "R$ 10k",
    contact: "@clinica",
    trigger: "Anuncio ativo",
    stage: "Contato",
    score: 85,
    priority: "Alta",
    message: "Msg",
    contactStatus: "Mensagem enviada",
    createdAt: "2026-03-20T00:00:00.000Z",
    followUpIntervalDays: 2,
    followUpStep: 0,
    nextFollowUpAt: null,
    lastContactAt: null,
    ...overrides,
  };
}

describe("getFollowUpsDue", () => {
  const now = new Date("2026-03-26T12:00:00.000Z");

  it("returns leads with overdue follow-ups", () => {
    const leads = [
      buildLead({ id: "l1", nextFollowUpAt: "2026-03-25T00:00:00.000Z" }),
      buildLead({ id: "l2", nextFollowUpAt: "2026-03-27T00:00:00.000Z" }),
    ];

    const due = getFollowUpsDue(leads, now);

    expect(due).toHaveLength(1);
    expect(due[0]?.leadId).toBe("l1");
    expect(due[0]?.overdueDays).toBe(1);
  });

  it("excludes closed and lost leads", () => {
    const leads = [
      buildLead({ id: "l1", stage: "Fechado", nextFollowUpAt: "2026-03-24T00:00:00.000Z" }),
      buildLead({ id: "l2", stage: "Perdido", nextFollowUpAt: "2026-03-24T00:00:00.000Z" }),
    ];

    expect(getFollowUpsDue(leads, now)).toHaveLength(0);
  });

  it("excludes leads that already responded", () => {
    const leads = [
      buildLead({
        contactStatus: "Respondeu",
        nextFollowUpAt: "2026-03-24T00:00:00.000Z",
      }),
    ];

    expect(getFollowUpsDue(leads, now)).toHaveLength(0);
  });

  it("sorts by most overdue first", () => {
    const leads = [
      buildLead({ id: "l1", nextFollowUpAt: "2026-03-25T00:00:00.000Z" }),
      buildLead({ id: "l2", nextFollowUpAt: "2026-03-22T00:00:00.000Z" }),
    ];

    const due = getFollowUpsDue(leads, now);
    expect(due[0]?.leadId).toBe("l2");
    expect(due[1]?.leadId).toBe("l1");
  });

  it("includes touchpoint and script from outreach steps", () => {
    const leads = [buildLead({ followUpStep: 1, nextFollowUpAt: "2026-03-25T00:00:00.000Z" })];

    const due = getFollowUpsDue(leads, now);
    expect(due[0]?.nextTouchpoint).toBe("WhatsApp");
  });
});

describe("advanceFollowUp", () => {
  const now = new Date("2026-03-26T12:00:00.000Z");

  it("increments step and schedules next follow-up", () => {
    const lead = buildLead({ followUpStep: 0, followUpIntervalDays: 3 });

    const updates = advanceFollowUp(lead, now);

    expect(updates.followUpStep).toBe(1);
    expect(updates.lastContactAt).toBe("2026-03-26T12:00:00.000Z");
    expect(updates.nextFollowUpAt).toBeTruthy();

    const nextDate = new Date(updates.nextFollowUpAt!);
    const diffDays = Math.round((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(3);
  });

  it("clears nextFollowUpAt when all steps are completed", () => {
    const lead = buildLead({ followUpStep: 2 });

    const updates = advanceFollowUp(lead, now);

    expect(updates.followUpStep).toBe(3);
    expect(updates.nextFollowUpAt).toBeNull();
    expect(updates.contactStatus).toBe("Mensagem enviada");
  });
});

describe("scheduleFirstFollowUp", () => {
  const now = new Date("2026-03-26T12:00:00.000Z");

  it("sets step 0 and schedules first follow-up", () => {
    const lead = buildLead({ stage: "Novo", contactStatus: "Pendente" });

    const updates = scheduleFirstFollowUp(lead, now);

    expect(updates.followUpStep).toBe(0);
    expect(updates.contactStatus).toBe("Mensagem enviada");
    expect(updates.stage).toBe("Contato");
    expect(updates.lastContactAt).toBe("2026-03-26T12:00:00.000Z");
    expect(updates.nextFollowUpAt).toBeTruthy();
  });

  it("does not change stage if already past Novo", () => {
    const lead = buildLead({ stage: "Diagnóstico" });

    const updates = scheduleFirstFollowUp(lead, now);

    expect(updates.stage).toBe("Diagnóstico");
  });
});
