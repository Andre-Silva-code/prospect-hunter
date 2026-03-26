import type { LeadPriority } from "@/types/prospecting";

export function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value << 5) - value + input.charCodeAt(index);
    value |= 0;
  }
  return Math.abs(value);
}

export function normalizeScore(score: number | undefined, seed: string): number {
  if (typeof score === "number") {
    return Math.max(40, Math.min(95, Math.round(score)));
  }
  return 55 + (hash(seed) % 40);
}

export function deriveScoreFromSignals(
  followers: number | undefined,
  reviews: number | undefined
): number {
  const followerPoints = followers ? Math.min(20, Math.round(Math.log10(followers + 1) * 7)) : 0;
  const reviewPoints = reviews ? Math.min(20, Math.round(Math.log10(reviews + 1) * 8)) : 0;
  return 55 + followerPoints + reviewPoints;
}

export function scoreToPriority(score: number): LeadPriority {
  if (score >= 80) return "Alta";
  if (score >= 60) return "Media";
  return "Baixa";
}

export function estimateBudget(score: number): string {
  if (score >= 85) return "R$ 15k";
  if (score >= 70) return "R$ 10k";
  if (score >= 60) return "R$ 7k";
  return "R$ 5k";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

export function parseBackoffSequence(
  raw: string | undefined,
  size: number,
  fallback: number[]
): number[] {
  if (!raw) return fallback.slice(0, Math.max(1, size));
  const parsed = raw
    .split(",")
    .map((chunk) => Number(chunk.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value));
  if (parsed.length === 0) return fallback.slice(0, Math.max(1, size));
  return parsed;
}

export async function fetchWithTimeout(
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

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
}

export function pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function pickFirstNumber(
  record: Record<string, unknown>,
  keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function buildNameFromParts(
  firstName: string | null,
  lastName: string | null
): string | null {
  const value = [firstName ?? "", lastName ?? ""].join(" ").trim();
  return value.length > 0 ? value : null;
}

export function extractRegionFromApifyItem(
  item: Record<string, unknown>,
  fallback: string
): string {
  const locationField = item.location;
  if (locationField && typeof locationField === "object") {
    const locationRecord = locationField as Record<string, unknown>;
    const parsed = locationRecord.parsed;
    if (parsed && typeof parsed === "object") {
      const parsedRecord = parsed as Record<string, unknown>;
      const city = typeof parsedRecord.city === "string" ? parsedRecord.city : "";
      const state = typeof parsedRecord.state === "string" ? parsedRecord.state : "";
      const composed = [city, state].filter(Boolean).join(", ").trim();
      if (composed.length > 0) return composed;
    }
    if (
      typeof locationRecord.linkedinText === "string" &&
      locationRecord.linkedinText.trim().length > 0
    ) {
      return locationRecord.linkedinText.trim();
    }
  }
  return (
    pickFirstString(item, ["city", "locationName", "location", "address", "formattedAddress"]) ??
    fallback
  );
}
