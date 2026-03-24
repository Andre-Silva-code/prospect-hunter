import type { LeadPriority, LeadSource } from "@/types/prospecting";

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

  return {
    results: chunks.flat(),
    connectorStatus,
  };
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
    status: `${results.length} lead(s) via Apify ${sourceLabel}`,
  };
}

async function searchGooglePlaces(
  source: "Google Maps" | "Google Meu Negócio",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const apifyResult = await searchApifyGoogleConnector(source, request);
  if (apifyResult.status !== "Sem conector configurado") {
    return apifyResult;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
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

    return {
      results,
      status: `${results.length} lead(s) encontrado(s)`,
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
    status: `${results.length} lead(s) via Apify ${sourceLabel}`,
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
      searchType: "user",
      maxItems: request.limitPerSource,
      resultsLimit: request.limitPerSource,
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
    keywords: [baseSearch],
    query: baseSearch,
    limit: request.limitPerSource,
    maxItems: request.limitPerSource,
  };
}

async function runApify(
  taskId: string | undefined,
  actorId: string | undefined,
  token: string,
  input: Record<string, unknown>
): Promise<unknown[] | { results: ProspectSearchResult[]; status: string }> {
  const baseUrl = process.env.APIFY_API_BASE_URL ?? "https://api.apify.com";
  const runEndpoint = taskId
    ? `${baseUrl}/v2/actor-tasks/${encodeURIComponent(taskId)}/runs?token=${encodeURIComponent(token)}&waitForFinish=120`
    : `${baseUrl}/v2/acts/${encodeURIComponent(actorId!)}/runs?token=${encodeURIComponent(token)}&waitForFinish=120`;

  try {
    const runResponse = await fetch(runEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });

    if (!runResponse.ok) {
      return { results: [], status: `Apify indisponivel (${runResponse.status})` };
    }

    const runPayload = (await runResponse.json()) as ApifyRunResponse;
    const datasetId = runPayload.data?.defaultDatasetId;
    if (!datasetId) {
      return { results: [], status: "Apify sem dataset de saida" };
    }

    const datasetUrl = `${baseUrl}/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&clean=true&format=json`;
    const datasetResponse = await fetch(datasetUrl, { cache: "no-store" });

    if (!datasetResponse.ok) {
      return { results: [], status: `Falha ao ler dataset Apify (${datasetResponse.status})` };
    }

    const datasetPayload = (await datasetResponse.json()) as unknown;
    if (!Array.isArray(datasetPayload)) {
      return { results: [], status: "Dataset Apify em formato invalido" };
    }

    return datasetPayload;
  } catch {
    return { results: [], status: "Falha ao executar Apify" };
  }
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
