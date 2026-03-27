import type { LeadRecord, LeadSource, PipelineStage } from "@/types/prospecting";

export type DashboardMetrics = {
  totalLeads: number;
  leadsByStage: Record<PipelineStage, number>;
  leadsBySource: Partial<Record<LeadSource, number>>;
  responseRate: number;
  conversionRate: number;
  avgScore: number;
  followUpsPending: number;
  followUpsOverdue: number;
  leadsThisWeek: number;
  contactedThisWeek: number;
};

const PIPELINE_STAGES: PipelineStage[] = [
  "Novo",
  "Contato",
  "Diagnóstico",
  "Proposta",
  "Fechado",
  "Perdido",
];

export function calculateMetrics(leads: LeadRecord[], now: Date = new Date()): DashboardMetrics {
  const totalLeads = leads.length;

  const leadsByStage = Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage, leads.filter((l) => l.stage === stage).length])
  ) as Record<PipelineStage, number>;

  const leadsBySource: Partial<Record<LeadSource, number>> = {};
  for (const lead of leads) {
    const source = lead.source ?? "Instagram";
    leadsBySource[source] = (leadsBySource[source] ?? 0) + 1;
  }

  const contacted = leads.filter(
    (l) => l.contactStatus === "Mensagem enviada" || l.contactStatus === "Respondeu"
  );
  const responded = leads.filter((l) => l.contactStatus === "Respondeu");
  const responseRate = contacted.length > 0 ? responded.length / contacted.length : 0;

  const closed = leads.filter((l) => l.stage === "Fechado");
  const conversionRate = totalLeads > 0 ? closed.length / totalLeads : 0;

  const avgScore =
    totalLeads > 0 ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / totalLeads) : 0;

  const followUpsPending = leads.filter((l) => {
    if (!l.nextFollowUpAt) return false;
    if (l.stage === "Fechado" || l.stage === "Perdido") return false;
    return new Date(l.nextFollowUpAt) > now;
  }).length;

  const followUpsOverdue = leads.filter((l) => {
    if (!l.nextFollowUpAt) return false;
    if (l.stage === "Fechado" || l.stage === "Perdido") return false;
    return new Date(l.nextFollowUpAt) <= now;
  }).length;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const leadsThisWeek = leads.filter((l) => new Date(l.createdAt) >= weekAgo).length;
  const contactedThisWeek = leads.filter(
    (l) => l.lastContactAt && new Date(l.lastContactAt) >= weekAgo
  ).length;

  return {
    totalLeads,
    leadsByStage,
    leadsBySource,
    responseRate,
    conversionRate,
    avgScore,
    followUpsPending,
    followUpsOverdue,
    leadsThisWeek,
    contactedThisWeek,
  };
}
