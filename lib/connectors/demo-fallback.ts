import type { LeadPriority, LeadSource } from "@/types/prospecting";
import { prospects as demoProspects } from "@/lib/prospecting-data";
import type { ProspectSearchRequest, ProspectSearchResult } from "./types";
import { hash } from "./utils";

export function shouldUseDemoFallback(
  connectorStatus: Partial<Record<LeadSource, string>>
): boolean {
  const enabledByEnv = process.env.PROSPECTING_ENABLE_DEMO_FALLBACK;
  const allowDemo =
    enabledByEnv === "true" || (enabledByEnv !== "false" && process.env.NODE_ENV !== "production");

  if (!allowDemo) return false;

  const statuses = Object.values(connectorStatus).filter((value): value is string =>
    Boolean(value)
  );
  if (statuses.length === 0) return true;

  return statuses.every((status) => {
    return (
      status.includes("Sem conector configurado") ||
      status.includes("0 lead(s) via Apify") ||
      status.includes("indisponivel") ||
      status.includes("timeout") ||
      status.includes("Falha ao consultar")
    );
  });
}

export function buildDemoFallbackResults(request: ProspectSearchRequest): ProspectSearchResult[] {
  return demoProspects
    .filter((item) => request.sources.includes(item.source))
    .map((item, index) => ({
      id: `${item.source}-demo-${index}-${hash(`${item.company}-${request.region}`)}`,
      company: `${item.company} (demo)`,
      niche: request.niche,
      region: request.region,
      monthlyBudget: item.monthlyBudget,
      score: item.score,
      priority: item.priority as LeadPriority,
      trigger: `${item.trigger} [fallback local]`,
      source: item.source,
      icp: request.icp,
      contact: "Sem contato publico",
      sourceUrl: undefined,
    }))
    .slice(0, request.limitPerSource * Math.max(1, request.sources.length));
}
