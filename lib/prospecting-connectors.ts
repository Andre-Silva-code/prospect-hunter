import type { LeadPriority, LeadSource } from "@/types/prospecting";
import { prospects as demoProspects } from "@/lib/prospecting-data";

export type ProspectSearchResult = {
  id: string;
  company: string;
  niche: string;
  region: string;
  monthlyBudget: string;
  score: number;
  priority: LeadPriority;
  trigger: string;
  source: LeadSource;
  icp: string;
  contact: string;
  sourceUrl?: string;
};

export type ProspectSearchRequest = {
  icp: string;
  niche: string;
  region: string;
  sources: LeadSource[];
  limitPerSource: number;
};

export type ProspectSearchResponse = {
  results: ProspectSearchResult[];
  connectorStatus: Partial<Record<LeadSource, string>>;
};

type GenericConnectorItem = {
  company?: string;
  niche?: string;
  region?: string;
  monthlyBudget?: string;
  score?: number;
  trigger?: string;
  contact?: string;
  sourceUrl?: string;
};

type ApifyRunResponse = {
  data?: {
    status?: string;
    defaultDatasetId?: string;
  };
};

type ConnectorErrorResult = {
  results: ProspectSearchResult[];
  status: string;
  retryable?: boolean;
};

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

      return {
        results: demoResults,
        connectorStatus,
      };
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

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        return { results: [], status: "Conector retornou formato invalido" };
      }

      const results = payload
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
  if (apifyResult.status !== "Sem conector configurado") {
    return apifyResult;
  }

  return {
    results: [],
    status: "Sem conector configurado",
  };
}

async function searchApifyConnector(
  source: "Instagram" | "LinkedIn",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return { results: [], status: "Sem conector configurado" };
  }

  const taskId =
    source === "Instagram"
      ? process.env.PROSPECT_APIFY_INSTAGRAM_TASK_ID
      : process.env.PROSPECT_APIFY_LINKEDIN_TASK_ID;
  const actorId =
    source === "Instagram"
      ? process.env.PROSPECT_APIFY_INSTAGRAM_ACTOR_ID
      : process.env.PROSPECT_APIFY_LINKEDIN_ACTOR_ID;

  if (!taskId && !actorId) {
    return { results: [], status: "Sem conector configurado" };
  }

  const datasetPayload = await runApify(taskId, actorId, token, buildApifyInput(source, request));
  if ("status" in datasetPayload) {
    return datasetPayload;
  }

  const results = datasetPayload
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

async function searchGooglePlaces(
  source: "Google Maps" | "Google Meu Negócio",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const apifyResult = await searchApifyGoogleConnector(source, request);
  if (
    apifyResult.status !== "Sem conector configurado" &&
    !shouldFallbackToGooglePlaces(apifyResult.status, apifyResult.results.length)
  ) {
    return apifyResult;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    if (apifyResult.status !== "Sem conector configurado") {
      return {
        results: apifyResult.results,
        status: `${apifyResult.status} | fallback Google Places indisponivel (GOOGLE_MAPS_API_KEY nao configurada)`,
      };
    }
    return { results: [], status: "GOOGLE_MAPS_API_KEY nao configurada" };
  }

  const queryPrefix = source === "Google Meu Negócio" ? "google meu negocio" : "google maps";
  const textQuery = `${request.niche} ${request.region} ${queryPrefix}`;

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.googleMapsUri,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "pt-BR",
        maxResultCount: request.limitPerSource,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { results: [], status: `Google Places indisponivel (${response.status})` };
    }

    const payload = (await response.json()) as { places?: Array<Record<string, unknown>> };
    const places = payload.places ?? [];

    const results = places
      .map((place, index) => normalizeGooglePlace(place, source, request, index))
      .filter((item): item is ProspectSearchResult => item !== null);

    const fallbackPrefix =
      apifyResult.status !== "Sem conector configurado"
        ? `${apifyResult.status} | fallback Google Places: `
        : "";

    return {
      results,
      status: `${fallbackPrefix}${results.length} lead(s) encontrado(s)`,
    };
  } catch {
    return { results: [], status: "Falha ao consultar Google Places" };
  }
}

async function searchApifyGoogleConnector(
  source: "Google Maps" | "Google Meu Negócio",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return { results: [], status: "Sem conector configurado" };
  }

  const taskId =
    source === "Google Meu Negócio"
      ? process.env.PROSPECT_APIFY_GOOGLE_MY_BUSINESS_TASK_ID
      : process.env.PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID;
  const actorId =
    source === "Google Meu Negócio"
      ? process.env.PROSPECT_APIFY_GOOGLE_MY_BUSINESS_ACTOR_ID
      : process.env.PROSPECT_APIFY_GOOGLE_MAPS_ACTOR_ID;

  if (!taskId && !actorId) {
    return { results: [], status: "Sem conector configurado" };
  }

  const datasetPayload = await runApify(taskId, actorId, token, buildApifyInput(source, request));
  if ("status" in datasetPayload) {
    return datasetPayload;
  }

  const results = datasetPayload
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

function normalizeConnectorItem(
  value: unknown,
  source: LeadSource,
  request: ProspectSearchRequest,
  index: number
): ProspectSearchResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as GenericConnectorItem;
  if (typeof item.company !== "string" || item.company.trim().length === 0) {
    return null;
  }

  const score = normalizeScore(item.score, `${item.company}-${source}-${index}`);

  return {
    id: `${source}-${index}-${hash(`${item.company}-${request.region}`)}`,
    company: item.company.trim(),
    niche: (item.niche ?? request.niche).trim(),
    region: (item.region ?? request.region).trim(),
    monthlyBudget: (item.monthlyBudget ?? estimateBudget(score)).trim(),
    score,
    priority: scoreToPriority(score),
    trigger: (item.trigger ?? `Sinal capturado via ${source}.`).trim(),
    source,
    icp: request.icp,
    contact: (item.contact ?? "Sem contato publico").trim(),
    sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : undefined,
  };
}

function normalizeApifyItem(
  value: unknown,
  source: LeadSource,
  request: ProspectSearchRequest,
  index: number
): ProspectSearchResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const company =
    pickFirstString(item, [
      "companyName",
      "businessName",
      "name",
      "title",
      "username",
      "handle",
      "pageName",
      "fullName",
    ]) ?? "";

  if (!company) {
    return null;
  }

  const niche = pickFirstString(item, ["industry", "category", "niche"]) ?? request.niche;
  const region =
    pickFirstString(item, ["city", "locationName", "location", "address", "formattedAddress"]) ??
    request.region;
  const contact =
    pickFirstString(item, ["email", "phone", "website", "websiteUrl", "url", "profileUrl"]) ??
    "Sem contato publico";
  const trigger =
    pickFirstString(item, ["bio", "description", "about", "headline"]) ??
    `Lead encontrado via ${source} no Apify.`;
  const sourceUrl = pickFirstString(item, [
    "url",
    "profileUrl",
    "linkedinUrl",
    "instagramUrl",
    "googleMapsUrl",
  ]);

  const followers = pickFirstNumber(item, ["followers", "followersCount", "followerCount"]);
  const reviews = pickFirstNumber(item, ["reviewsCount", "userRatingCount", "ratingsCount"]);
  const baseScore = normalizeScore(
    pickFirstNumber(item, ["score"]) ?? deriveScoreFromSignals(followers, reviews),
    `${company}-${source}-${index}`
  );

  return {
    id: `${source}-${index}-${hash(`${company}-${region}`)}`,
    company,
    niche,
    region,
    monthlyBudget: estimateBudget(baseScore),
    score: baseScore,
    priority: scoreToPriority(baseScore),
    trigger,
    source,
    icp: request.icp,
    contact,
    sourceUrl: sourceUrl ?? undefined,
  };
}

function normalizeGooglePlace(
  place: Record<string, unknown>,
  source: LeadSource,
  request: ProspectSearchRequest,
  index: number
): ProspectSearchResult | null {
  const displayName = place.displayName as { text?: string } | undefined;
  const company = displayName?.text;
  if (!company) {
    return null;
  }

  const rating = typeof place.rating === "number" ? place.rating : 0;
  const ratingCount = typeof place.userRatingCount === "number" ? place.userRatingCount : 0;
  const score = Math.min(
    95,
    Math.max(55, Math.round(55 + rating * 6 + Math.log10(ratingCount + 1) * 8))
  );
  const phone = typeof place.nationalPhoneNumber === "string" ? place.nationalPhoneNumber : "";
  const website = typeof place.websiteUri === "string" ? place.websiteUri : "";
  const address =
    typeof place.formattedAddress === "string" ? place.formattedAddress : request.region;
  const mapsUrl = typeof place.googleMapsUri === "string" ? place.googleMapsUri : undefined;

  return {
    id: `${source}-${index}-${hash(`${company}-${address}`)}`,
    company,
    niche: request.niche,
    region: address,
    monthlyBudget: estimateBudget(score),
    score,
    priority: scoreToPriority(score),
    trigger: `Perfil com nota ${rating.toFixed(1)} e ${ratingCount} avaliacao(oes) no Google.`,
    source,
    icp: request.icp,
    contact: website || phone || "Sem contato publico",
    sourceUrl: mapsUrl,
  };
}

function normalizeScore(score: number | undefined, seed: string): number {
  if (typeof score === "number") {
    return Math.max(40, Math.min(95, Math.round(score)));
  }

  return 55 + (hash(seed) % 40);
}

function deriveScoreFromSignals(
  followers: number | undefined,
  reviews: number | undefined
): number {
  const followerPoints = followers ? Math.min(20, Math.round(Math.log10(followers + 1) * 7)) : 0;
  const reviewPoints = reviews ? Math.min(20, Math.round(Math.log10(reviews + 1) * 8)) : 0;
  return 55 + followerPoints + reviewPoints;
}

function scoreToPriority(score: number): LeadPriority {
  if (score >= 80) return "Alta";
  if (score >= 60) return "Media";
  return "Baixa";
}

function estimateBudget(score: number): string {
  if (score >= 85) return "R$ 15k";
  if (score >= 70) return "R$ 10k";
  if (score >= 60) return "R$ 7k";
  return "R$ 5k";
}

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value << 5) - value + input.charCodeAt(index);
    value |= 0;
  }

  return Math.abs(value);
}

function buildApifyInput(
  source: LeadSource,
  request: ProspectSearchRequest
): Record<string, unknown> {
  const baseSearch = `${request.niche} ${request.region}`;

  if (source === "Instagram") {
    return {
      search: baseSearch,
      searchQuery: baseSearch,
      query: baseSearch,
      searchStringsArray: [baseSearch],
      searchType: "user",
      maxItems: request.limitPerSource,
      resultsLimit: request.limitPerSource,
      limit: request.limitPerSource,
      includeRelatedProfiles: false,
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
    };
  }

  return {
    search: baseSearch,
    searchQuery: baseSearch,
    keywords: [baseSearch],
    query: baseSearch,
    limit: request.limitPerSource,
    maxItems: request.limitPerSource,
  };
}

function shouldFallbackToGooglePlaces(status: string, resultsCount: number): boolean {
  if (resultsCount > 0) {
    return false;
  }

  if (status.includes("Apify indisponivel (402)")) {
    return true;
  }

  if (status.includes("Apify indisponivel (429)")) {
    return true;
  }

  if (status.includes("timeout")) {
    return true;
  }

  if (status.startsWith("0 lead(s) via Apify")) {
    return true;
  }

  return false;
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
    if (Array.isArray(outcome)) {
      return outcome;
    }

    lastFailure = outcome;

    if (!outcome.retryable || attempt >= maxRetries - 1) {
      break;
    }

    const delayMs = backoffSequence[Math.min(attempt, backoffSequence.length - 1)] ?? 1000;
    await sleep(delayMs);
  }

  if (!lastFailure) {
    return { results: [], status: "Falha ao executar Apify" };
  }

  const attemptsLabel = attemptsUsed > 1 ? ` após ${attemptsUsed} tentativas` : "";
  return {
    results: [],
    status: `${lastFailure.status}${attemptsLabel}`,
  };
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
        headers: {
          "Content-Type": "application/json",
        },
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

    const runPayload = (await runResponse.json()) as ApifyRunResponse;
    const runStatus = runPayload.data?.status ?? "UNKNOWN";
    if (runStatus !== "SUCCEEDED") {
      return {
        results: [],
        status: `Apify run terminou com status ${runStatus}`,
        retryable: runStatus === "TIMED-OUT",
      };
    }

    const datasetId = runPayload.data?.defaultDatasetId;
    if (!datasetId) {
      return { results: [], status: "Apify sem dataset de saida" };
    }

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

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (error as { name?: string }).name === "AbortError";
}

function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.trunc(parsed);
}

function parseBackoffSequence(raw: string | undefined, size: number, fallback: number[]): number[] {
  if (!raw) {
    return fallback.slice(0, Math.max(1, size));
  }

  const parsed = raw
    .split(",")
    .map((chunk) => Number(chunk.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value));

  if (parsed.length === 0) {
    return fallback.slice(0, Math.max(1, size));
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldUseDemoFallback(connectorStatus: Partial<Record<LeadSource, string>>): boolean {
  const enabledByEnv = process.env.PROSPECTING_ENABLE_DEMO_FALLBACK;
  const allowDemo =
    enabledByEnv === "true" || (enabledByEnv !== "false" && process.env.NODE_ENV !== "production");

  if (!allowDemo) {
    return false;
  }

  const statuses = Object.values(connectorStatus).filter((value): value is string =>
    Boolean(value)
  );
  if (statuses.length === 0) {
    return true;
  }

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

function buildDemoFallbackResults(request: ProspectSearchRequest): ProspectSearchResult[] {
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

function pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function pickFirstNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}
