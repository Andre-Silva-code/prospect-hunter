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

/** Extrai username do Instagram a partir de uma URL do perfil */
function extractInstagramUsername(url: string): string | null {
  const match = /instagram\.com\/([A-Za-z0-9_.]+)\/?/.exec(url);
  return match?.[1] ?? null;
}

/**
 * Tenta extrair número de WhatsApp de textos de bio/descrição do Instagram.
 * Padrões comuns: "(11) 99999-9999", "wa.me/5511...", "WhatsApp 11999..."
 */
function extractWhatsAppFromBio(text: string): string | null {
  // wa.me link
  const waMe = /wa\.me\/(\d{10,15})/.exec(text);
  if (waMe) return waMe[1];

  // Número brasileiro com DDD — vários formatos
  const brPhone =
    /(?:WhatsApp|Whats|WA|Fone|Tel|Contato|Zap)?[:\s]*\(?((?:55)?\d{2})\)?\s*9?\d{4}[-.\s]?\d{4}/i.exec(
      text
    );
  if (brPhone) {
    const raw = brPhone[0].replace(/\D/g, "");
    if (raw.length >= 10) return raw.startsWith("55") ? raw : `55${raw}`;
  }

  return null;
}

export function normalizeApifyItem(
  value: unknown,
  source: LeadSource,
  request: ProspectSearchRequest,
  index: number
): ProspectSearchResult | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;

  // Instagram via Google Search: campos são title, url, description
  if (source === "Instagram") {
    const url = pickFirstString(item, ["url", "link", "displayLink"]) ?? "";
    const username = extractInstagramUsername(url);
    if (!username) return null;

    const rawTitle = pickFirstString(item, ["title"]) ?? username;
    // Título do Google: "Nome da Conta (@username) • Instagram"
    const company =
      rawTitle
        .replace(/\s*\(@?[^)]+\).*$/, "")
        .replace(/\s*•.*$/, "")
        .trim() || username;
    const description =
      pickFirstString(item, ["description", "snippet", "snip"]) ??
      `Perfil encontrado via Instagram.`;

    // Tenta extrair WhatsApp da bio/descrição — se encontrar, contato = número
    const whatsapp = extractWhatsAppFromBio(description);
    const contact = whatsapp ?? `@${username}`;

    return {
      id: `Instagram-${index}-${username}`,
      company,
      niche: request.niche,
      region: request.city ?? request.region,
      monthlyBudget: estimateBudget(65),
      score: 65,
      priority: "Media",
      trigger: description,
      source,
      icp: request.icp,
      contact,
      sourceUrl: `https://www.instagram.com/${username}/`,
    };
  }

  const companyCandidate =
    pickFirstString(item, [
      "companyName",
      "businessName",
      "name",
      "title",
      "ownerFullName",
      "fullName",
      "username",
      "ownerUsername",
      "handle",
      "pageName",
    ]) ?? "";

  const company =
    companyCandidate ||
    buildNameFromParts(pickFirstString(item, ["firstName"]), pickFirstString(item, ["lastName"])) ||
    pickFirstString(item, ["publicIdentifier"]) ||
    "";

  if (!company) return null;

  const niche = pickFirstString(item, ["industry", "category", "niche"]) ?? request.niche;
  const region = extractRegionFromApifyItem(item, request.region);
  // Instagram: prioriza telefone/email de negócio, depois site, depois username
  const contactParts: string[] = [];
  const businessPhone = pickFirstString(item, ["businessPhoneNumber", "phone", "phoneNumber"]);
  const businessEmail = pickFirstString(item, ["businessEmail", "email", "publicEmail"]);
  const website = pickFirstString(item, ["externalUrl", "website", "websiteUrl", "externalUrls"]);
  const username = pickFirstString(item, ["username", "ownerUsername", "handle"]);
  if (businessPhone) contactParts.push(businessPhone);
  if (businessEmail) contactParts.push(businessEmail);
  if (website) contactParts.push(website);
  if (contactParts.length === 0 && username) contactParts.push(`@${username}`);
  const contact = contactParts.length > 0 ? contactParts.join(" | ") : "Sem contato publico";

  const trigger =
    pickFirstString(item, ["biography", "bio", "description", "about", "headline", "caption"]) ??
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
