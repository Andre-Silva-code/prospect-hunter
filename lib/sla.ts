import type { LeadRecord } from "@/types/prospecting";

/**
 * SLA de primeiro contato: quantas horas um lead pode ficar em "Novo"
 * antes de ser considerado ATRASADO. Configurável via NEXT_PUBLIC_NEW_LEAD_SLA_HOURS.
 * Default: 2 horas.
 */
const DEFAULT_SLA_HOURS = 2;

export function getNewLeadSlaHours(): number {
  const raw = process.env.NEXT_PUBLIC_NEW_LEAD_SLA_HOURS;
  if (!raw) return DEFAULT_SLA_HOURS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SLA_HOURS;
}

/**
 * Retorna há quantas horas (corridas) o lead está parado na coluna "Novo".
 * Só faz sentido para leads em stage "Novo".
 */
export function hoursSinceCreated(lead: LeadRecord, now: Date = new Date()): number {
  const created = new Date(lead.createdAt).getTime();
  return (now.getTime() - created) / (1000 * 60 * 60);
}

/**
 * Um lead em "Novo" está atrasado no primeiro contato se ficou parado
 * além do SLA sem avançar de etapa.
 */
export function isNewLeadOverdue(lead: LeadRecord, now: Date = new Date()): boolean {
  if (lead.stage !== "Novo") return false;
  return hoursSinceCreated(lead, now) > getNewLeadSlaHours();
}

/**
 * Texto amigável do tempo de espera (ex: "3h", "2d").
 */
export function formatWaitingTime(lead: LeadRecord, now: Date = new Date()): string {
  const hours = hoursSinceCreated(lead, now);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}min`;
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}
