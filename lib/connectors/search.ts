import type { LeadSource } from "@/types/prospecting";
import type { ProspectSearchRequest, ProspectSearchResponse, ProspectSearchResult } from "./types";
import { GenericConnectorPayloadSchema } from "./types";
import { searchApifyConnector } from "./apify";
import { searchGooglePlaces } from "./google-places";
import { shouldUseDemoFallback, buildDemoFallbackResults } from "./demo-fallback";
import { normalizeConnectorItem } from "./normalizers";

export async function searchProspects(
  request: ProspectSearchRequest
): Promise<ProspectSearchResponse> {
  const connectorStatus: Partial<Record<LeadSource, string>> = {};

  const chunks = await Promise.all(
    request.sources.map(async (source) => {
      if (source === "Google Maps" || source === "Google Meu Negócio") {
        const result = await searchGooglePlaces(source, request);
        connectorStatus[source] = result.status;
        return result.results;
      }

      const result = await searchGenericConnector(source, request);
      connectorStatus[source] = result.status;
      return result.results;
    })
  );

  const results = chunks.flat();

  if (results.length === 0 && shouldUseDemoFallback(connectorStatus)) {
    const demoResults = buildDemoFallbackResults(request);
    if (demoResults.length > 0) {
      for (const source of request.sources) {
        const existingStatus = connectorStatus[source];
        const demoCount = demoResults.filter((result) => result.source === source).length;
        const prefix = existingStatus ? `${existingStatus} | ` : "";
        connectorStatus[source] = `${prefix}fallback local: ${demoCount} lead(s) demo`;
      }

      return { results: demoResults, connectorStatus };
    }
  }

  return { results, connectorStatus };
}

async function searchGenericConnector(
  source: "Instagram" | "LinkedIn",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const connectorUrl =
    source === "Instagram"
      ? process.env.PROSPECT_CONNECTOR_INSTAGRAM_URL
      : process.env.PROSPECT_CONNECTOR_LINKEDIN_URL;
  const connectorToken = process.env.PROSPECT_CONNECTOR_TOKEN;

  if (connectorUrl) {
    try {
      const response = await fetch(connectorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(connectorToken ? { Authorization: `Bearer ${connectorToken}` } : {}),
        },
        body: JSON.stringify({
          source,
          icp: request.icp,
          niche: request.niche,
          region: request.region,
          limit: request.limitPerSource,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        return { results: [], status: `Conector indisponivel (${response.status})` };
      }

      const rawPayload = (await response.json()) as unknown;
      const parseResult = GenericConnectorPayloadSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        return { results: [], status: "Conector retornou formato invalido" };
      }

      const results = parseResult.data
        .map((item, index) => normalizeConnectorItem(item, source, request, index))
        .filter((item): item is ProspectSearchResult => item !== null)
        .slice(0, request.limitPerSource);

      return {
        results,
        status: `${results.length} lead(s) recebido(s)`,
      };
    } catch {
      return { results: [], status: "Falha ao consultar conector" };
    }
  }

  const apifyResult = await searchApifyConnector(source, request);
  if (apifyResult.status !== "Sem conector configurado") return apifyResult;

  return { results: [], status: "Sem conector configurado" };
}
