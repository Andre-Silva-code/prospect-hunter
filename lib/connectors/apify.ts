import type { LeadSource } from "@/types/prospecting";
import type { ConnectorErrorResult, ProspectSearchRequest, ProspectSearchResult } from "./types";
import { ApifyRunResponseSchema } from "./types";
import { normalizeApifyItem, extractApifyDatasetError } from "./normalizers";
import {
  fetchWithTimeout,
  isAbortError,
  parseBackoffSequence,
  parseIntegerEnv,
  sleep,
} from "./utils";

export function buildApifyInput(
  source: LeadSource,
  request: ProspectSearchRequest
): Record<string, unknown> {
  const baseSearch = `${request.niche} ${request.region}`;

  if (source === "Instagram") {
    // Busca perfis do Instagram via Google Search
    // Exclui posts (/p/) e reels (/reel/) para retornar só perfis
    const location = request.city ?? request.region;
    const query = `site:instagram.com "${request.niche}" "${location}" -site:instagram.com/p/ -site:instagram.com/reel/`;
    return {
      queries: query,
      resultsPerPage: Math.min(request.limitPerSource, 10),
      maxPagesPerQuery: 1,
    };
  }

  if (source === "Google Maps" || source === "Google Meu Negócio") {
    return {
      searchStringsArray: [baseSearch],
      query: baseSearch,
      maxCrawledPlacesPerSearch: request.limitPerSource,
      maxItems: request.limitPerSource,
      includeReviews: false,
      language: "pt-BR",
      countryCode: "br",
    };
  }

  // LinkedIn — busca por empresas com decisores
  return {
    search: baseSearch,
    searchQuery: `${request.niche} empresa ${request.region}`,
    keywords: [baseSearch, `${request.niche} serviços ${request.region}`],
    query: baseSearch,
    limit: request.limitPerSource,
    maxItems: request.limitPerSource,
    searchType: "company",
  };
}

export async function searchApifyConnector(
  source: "Instagram" | "LinkedIn",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { results: [], status: "Sem conector configurado" };

  // Instagram sempre usa o actor diretamente (ignora task salva no Apify)
  const taskId = source === "Instagram" ? undefined : process.env.PROSPECT_APIFY_INSTAGRAM_TASK_ID;
  const actorId =
    source === "Instagram"
      ? "apify~google-search-scraper"
      : process.env.PROSPECT_APIFY_LINKEDIN_ACTOR_ID;

  if (!taskId && !actorId) return { results: [], status: "Sem conector configurado" };

  return runAndNormalize(taskId, actorId, token, source, request);
}

export async function searchApifyGoogleConnector(
  source: "Google Maps" | "Google Meu Negócio",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { results: [], status: "Sem conector configurado" };

  const taskId =
    source === "Google Meu Negócio"
      ? process.env.PROSPECT_APIFY_GOOGLE_MY_BUSINESS_TASK_ID
      : process.env.PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID;
  const actorId =
    source === "Google Meu Negócio"
      ? process.env.PROSPECT_APIFY_GOOGLE_MY_BUSINESS_ACTOR_ID
      : process.env.PROSPECT_APIFY_GOOGLE_MAPS_ACTOR_ID;

  if (!taskId && !actorId) return { results: [], status: "Sem conector configurado" };

  return runAndNormalize(taskId, actorId, token, source, request);
}

/** Remove posts duplicados do mesmo perfil — mantém o primeiro por ownerUsername */
function deduplicateByUsername(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    const username =
      typeof record.ownerUsername === "string"
        ? record.ownerUsername
        : typeof record.username === "string"
          ? record.username
          : null;
    if (!username) return true;
    if (seen.has(username)) return false;
    seen.add(username);
    return true;
  });
}

async function runAndNormalize(
  taskId: string | undefined,
  actorId: string | undefined,
  token: string,
  source: LeadSource,
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const datasetPayload = await runApify(taskId, actorId, token, buildApifyInput(source, request));
  if ("status" in datasetPayload) return datasetPayload;

  const datasetError = extractApifyDatasetError(datasetPayload);
  if (datasetError) {
    return { results: [], status: `Apify dataset erro: ${datasetError}` };
  }

  // Para Instagram (hashtag): deduplica por ownerUsername antes de normalizar
  const deduplicatedPayload =
    source === "Instagram" ? deduplicateByUsername(datasetPayload) : datasetPayload;

  const results = deduplicatedPayload
    .map((item, index) => normalizeApifyItem(item, source, request, index))
    .filter((item): item is ProspectSearchResult => item !== null)
    .slice(0, request.limitPerSource);

  const sourceLabel = taskId ? "task" : "actor";
  return {
    results,
    status:
      results.length > 0
        ? `${results.length} lead(s) via Apify ${sourceLabel}`
        : `0 lead(s) via Apify ${sourceLabel} (verifique input/filtros da task)`,
  };
}

async function runApify(
  taskId: string | undefined,
  actorId: string | undefined,
  token: string,
  input: Record<string, unknown>
): Promise<unknown[] | ConnectorErrorResult> {
  const baseUrl = process.env.APIFY_API_BASE_URL ?? "https://api.apify.com";
  const waitForFinishSeconds = parseIntegerEnv("APIFY_RUN_WAIT_SECONDS", 120);
  const maxRetries = Math.max(1, parseIntegerEnv("APIFY_MAX_RETRIES", 3));
  const backoffSequence = parseBackoffSequence(
    process.env.APIFY_BACKOFF_MS,
    maxRetries,
    [2000, 4000, 8000]
  );
  const timeoutMs = Math.max(1000, parseIntegerEnv("APIFY_REQUEST_TIMEOUT_MS", 30000));

  const runEndpoint = taskId
    ? `${baseUrl}/v2/actor-tasks/${encodeURIComponent(taskId)}/runs?token=${encodeURIComponent(token)}&waitForFinish=${waitForFinishSeconds}`
    : `${baseUrl}/v2/acts/${encodeURIComponent(actorId!)}/runs?token=${encodeURIComponent(token)}&waitForFinish=${waitForFinishSeconds}`;

  let lastFailure: ConnectorErrorResult | null = null;
  let attemptsUsed = 0;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    attemptsUsed = attempt + 1;
    const outcome = await runApifyOnce(runEndpoint, baseUrl, token, input, timeoutMs);
    if (Array.isArray(outcome)) return outcome;

    lastFailure = outcome;
    if (!outcome.retryable || attempt >= maxRetries - 1) break;

    const delayMs = backoffSequence[Math.min(attempt, backoffSequence.length - 1)] ?? 1000;
    await sleep(delayMs);
  }

  if (!lastFailure) return { results: [], status: "Falha ao executar Apify" };

  const attemptsLabel = attemptsUsed > 1 ? ` após ${attemptsUsed} tentativas` : "";
  return { results: [], status: `${lastFailure.status}${attemptsLabel}` };
}

async function runApifyOnce(
  runEndpoint: string,
  baseUrl: string,
  token: string,
  input: Record<string, unknown>,
  timeoutMs: number
): Promise<unknown[] | ConnectorErrorResult> {
  try {
    const runResponse = await fetchWithTimeout(
      runEndpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      },
      timeoutMs
    );

    if (!runResponse.ok) {
      return {
        results: [],
        status: `Apify indisponivel (${runResponse.status})`,
        retryable: runResponse.status === 429 || runResponse.status >= 500,
      };
    }

    const rawPayload = (await runResponse.json()) as unknown;
    const parseResult = ApifyRunResponseSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      return { results: [], status: "Apify retornou resposta em formato invalido" };
    }

    const runPayload = parseResult.data;
    const runStatus = runPayload.data?.status ?? "UNKNOWN";
    if (runStatus !== "SUCCEEDED") {
      return {
        results: [],
        status: `Apify run terminou com status ${runStatus}`,
        retryable: runStatus === "TIMED-OUT",
      };
    }

    const datasetId = runPayload.data?.defaultDatasetId;
    if (!datasetId) return { results: [], status: "Apify sem dataset de saida" };

    const datasetUrl = `${baseUrl}/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&clean=true&format=json`;
    const datasetResponse = await fetchWithTimeout(datasetUrl, { cache: "no-store" }, timeoutMs);

    if (!datasetResponse.ok) {
      return {
        results: [],
        status: `Falha ao ler dataset Apify (${datasetResponse.status})`,
        retryable: datasetResponse.status === 429 || datasetResponse.status >= 500,
      };
    }

    const datasetPayload = (await datasetResponse.json()) as unknown;
    if (!Array.isArray(datasetPayload)) {
      return { results: [], status: "Dataset Apify em formato invalido" };
    }

    return datasetPayload;
  } catch (error) {
    if (isAbortError(error)) {
      return { results: [], status: "Apify timeout", retryable: true };
    }
    return { results: [], status: "Falha ao executar Apify", retryable: true };
  }
}
