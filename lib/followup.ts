import type { LeadRecord } from "@/types/prospecting";
import { outreachSteps } from "@/lib/prospecting-data";

export type FollowUpAction = {
  leadId: string;
  company: string;
  stage: LeadRecord["stage"];
  contactStatus: LeadRecord["contactStatus"];
  currentStep: number;
  totalSteps: number;
  nextTouchpoint: string;
  nextScript: string;
  dueAt: string;
  overdueDays: number;
};

export function getFollowUpsDue(leads: LeadRecord[], now: Date = new Date()): FollowUpAction[] {
  return leads
    .map((lead) => buildFollowUpAction(lead, now))
    .filter((action): action is FollowUpAction => action !== null)
    .sort((a, b) => b.overdueDays - a.overdueDays);
}

function buildFollowUpAction(lead: LeadRecord, now: Date): FollowUpAction | null {
  if (lead.stage === "Fechado" || lead.stage === "Perdido") return null;
  if (lead.contactStatus === "Respondeu") return null;

  const nextFollowUp = lead.nextFollowUpAt;
  if (!nextFollowUp) return null;

  const dueDate = new Date(nextFollowUp);
  if (dueDate > now) return null;

  const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentStep = lead.followUpStep ?? 0;
  const totalSteps = outreachSteps.length;
  const stepIndex = Math.min(currentStep, totalSteps - 1);
  const step = outreachSteps[stepIndex];

  return {
    leadId: lead.id,
    company: lead.company,
    stage: lead.stage,
    contactStatus: lead.contactStatus,
    currentStep,
    totalSteps,
    nextTouchpoint: step?.touchpoint ?? "Contato direto",
    nextScript: step?.script ?? "Follow-up de acompanhamento.",
    dueAt: nextFollowUp,
    overdueDays,
  };
}

export function advanceFollowUp(lead: LeadRecord, now: Date = new Date()): Partial<LeadRecord> {
  const currentStep = (lead.followUpStep ?? 0) + 1;
  const intervalDays = lead.followUpIntervalDays ?? 2;
  const totalSteps = outreachSteps.length;

  const nextFollowUpAt =
    currentStep >= totalSteps
      ? null
      : new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    followUpStep: currentStep,
    lastContactAt: now.toISOString(),
    nextFollowUpAt,
    contactStatus: currentStep >= totalSteps ? "Mensagem enviada" : lead.contactStatus,
  };
}

export function scheduleFirstFollowUp(
  lead: LeadRecord,
  now: Date = new Date()
): Partial<LeadRecord> {
  const intervalDays = lead.followUpIntervalDays ?? 2;
  return {
    followUpStep: 0,
    lastContactAt: now.toISOString(),
    nextFollowUpAt: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString(),
    contactStatus: "Mensagem enviada",
    stage: lead.stage === "Novo" ? "Contato" : lead.stage,
  };
}
