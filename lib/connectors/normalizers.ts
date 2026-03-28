import type { LeadSource } from "@/types/prospecting";
import type {
  GenericConnectorItem,
  GooglePlace,
  ProspectSearchRequest,
  ProspectSearchResult,
} from "./types";
import {
  buildNameFromParts,
  deriveScoreFromSignals,
  estimateBudget,
  extractRegionFromApifyItem,
  hash,
  normalizeScore,
  pickFirstNumber,
  pickFirstString,
  scoreToPriority,
} from "./utils";

export function normalizeConnectorItem(
  value: unknown,
  source: LeadSource,
  request: ProspectSearchRequest,
  index: number
): ProspectSearchResult | null {
  if (!value || typeof value !== "object") return null;

  const item = value as GenericConnectorItem;
  if (typeof item.company !== "string" || item.company.trim().length === 0) return null;

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

export function normalizeApifyItem(
  value: unknown,
  source: LeadSource,
  request: ProspectSearchRequest,
  index: number
): ProspectSearchResult | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;
  const companyCandidate =
    pickFirstString(item, [
      "companyName",
      "businessName",
      "name",
      "title",
      "username",
      "handle",
      "pageName",
      "fullName",
      "ownerFullName",
      "ownerUsername",
    ]) ?? "";

  const company =
    companyCandidate ||
    buildNameFromParts(pickFirstString(item, ["firstName"]), pickFirstString(item, ["lastName"])) ||
    pickFirstString(item, ["publicIdentifier"]) ||
    "";

  if (!company) return null;

  const niche = pickFirstString(item, ["industry", "category", "niche"]) ?? request.niche;
  const region = extractRegionFromApifyItem(item, request.region);
  const contact =
    pickFirstString(item, [
      "email",
      "phone",
      "website",
      "websiteUrl",
      "url",
      "profileUrl",
      "ownerUsername",
    ]) ?? "Sem contato publico";
  const trigger =
    pickFirstString(item, ["bio", "description", "about", "headline", "caption"]) ??
    `Lead encontrado via ${source} no Apify.`;
  const sourceUrl = pickFirstString(item, [
    "url",
    "profileUrl",
    "linkedinUrl",
    "instagramUrl",
    "googleMapsUrl",
    "inputUrl",
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
    sourceUrl:
      source === "Google Meu Negócio"
        ? `https://www.google.com/search?q=${encodeURIComponent(company + " " + (region || request.region))}`
        : (sourceUrl ?? undefined),
  };
}

export function normalizeGooglePlace(
  place: GooglePlace,
  source: LeadSource,
  request: ProspectSearchRequest,
  index: number
): ProspectSearchResult | null {
  const company = place.displayName?.text;
  if (!company) return null;

  const rating = place.rating ?? 0;
  const ratingCount = place.userRatingCount ?? 0;
  const score = Math.min(
    95,
    Math.max(55, Math.round(55 + rating * 6 + Math.log10(ratingCount + 1) * 8))
  );
  const phone = place.nationalPhoneNumber ?? "";
  const website = place.websiteUri ?? "";
  const address = place.formattedAddress ?? request.region;
  const mapsUrl = place.googleMapsUri;

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
    contact: [website, phone].filter(Boolean).join(" | ") || "Sem contato publico",
    sourceUrl:
      source === "Google Meu Negócio"
        ? `https://www.google.com/search?q=${encodeURIComponent(company + " " + (address || request.region))}`
        : mapsUrl,
  };
}

export function extractApifyDatasetError(datasetPayload: unknown[]): string | null {
  for (const item of datasetPayload) {
    if (!item || typeof item !== "object") continue;

    const errorMessage = (item as { error?: unknown }).error;
    if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
      const normalized = errorMessage.replace(/\s+/g, " ").trim();
      if (normalized.length > 140) return `${normalized.slice(0, 137)}...`;
      return normalized;
    }
  }
  return null;
}
