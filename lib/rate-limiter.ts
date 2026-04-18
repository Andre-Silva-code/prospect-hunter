import { logger } from "@/lib/logger";

type RateLimiterConfig = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

// Fallback em memória (desenvolvimento local ou quando Supabase indisponível)
const memoryBuckets = new Map<string, number[]>();

function checkRateLimitMemory(key: string, config: RateLimiterConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = memoryBuckets.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = timestamps[0]!;
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  timestamps.push(now);
  memoryBuckets.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

// --- Supabase-backed rate limiter ---

function canUseSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

async function checkRateLimitSupabase(
  key: string,
  config: RateLimiterConfig
): Promise<RateLimitResult> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  const baseHeaders = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // 1. Buscar bucket atual
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/rate_limit_buckets?key=eq.${encodeURIComponent(key)}&limit=1`,
      { headers: baseHeaders, cache: "no-store" }
    );

    if (!getRes.ok) throw new Error(`supabase GET rate_limit_buckets failed (${getRes.status})`);

    const payload = (await getRes.json()) as unknown[];
    const existing = Array.isArray(payload) && payload.length > 0 ? payload[0] : null;

    // 2. Filtrar timestamps dentro da janela
    const rawTimestamps: string[] =
      existing &&
      typeof existing === "object" &&
      Array.isArray((existing as Record<string, unknown>).timestamps)
        ? ((existing as Record<string, unknown>).timestamps as string[])
        : [];

    const activeTimestamps = rawTimestamps
      .map((t) => new Date(t).getTime())
      .filter((t) => t > windowStart);

    // 3. Verificar limite
    if (activeTimestamps.length >= config.maxRequests) {
      const oldestInWindow = Math.min(...activeTimestamps);
      const retryAfterMs = oldestInWindow + config.windowMs - now;
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    // 4. Adicionar timestamp atual e persistir via UPSERT
    activeTimestamps.push(now);
    const newTimestamps = activeTimestamps.map((t) => new Date(t).toISOString());

    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/rate_limit_buckets`, {
      method: "POST",
      headers: {
        ...baseHeaders,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        key,
        timestamps: newTimestamps,
        updated_at: new Date(now).toISOString(),
      }),
    });

    if (!upsertRes.ok) {
      throw new Error(`supabase UPSERT rate_limit_buckets failed (${upsertRes.status})`);
    }

    return { allowed: true, retryAfterMs: 0 };
  } catch (error) {
    // Fallback para memória se Supabase falhar
    logger.warn("[rate-limiter] Supabase indisponível, usando fallback em memória.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return checkRateLimitMemory(key, config);
  }
}

// --- API pública ---

export async function checkRateLimit(
  key: string,
  config: RateLimiterConfig
): Promise<RateLimitResult> {
  if (process.env.USE_LOCAL_STORAGE === "true" || !canUseSupabase()) {
    return checkRateLimitMemory(key, config);
  }
  return checkRateLimitSupabase(key, config);
}

export function resetRateLimit(key: string): void {
  memoryBuckets.delete(key);
}

export function resetAllRateLimits(): void {
  memoryBuckets.clear();
}

const defaultApifyConfig: RateLimiterConfig = {
  maxRequests: parseInt(process.env.APIFY_RATE_LIMIT_MAX ?? "10", 10) || 10,
  windowMs: parseInt(process.env.APIFY_RATE_LIMIT_WINDOW_MS ?? "60000", 10) || 60000,
};

const defaultGeminiConfig: RateLimiterConfig = {
  maxRequests: parseInt(process.env.GEMINI_RATE_LIMIT_MAX ?? "30", 10) || 30,
  windowMs: parseInt(process.env.GEMINI_RATE_LIMIT_WINDOW_MS ?? "60000", 10) || 60000,
};

const defaultUazapiConfig: RateLimiterConfig = {
  maxRequests: parseInt(process.env.UAZAPI_RATE_LIMIT_MAX ?? "10", 10) || 10,
  windowMs: parseInt(process.env.UAZAPI_RATE_LIMIT_WINDOW_MS ?? "300000", 10) || 300000,
};

export async function checkApifyRateLimit(userId: string = "global"): Promise<RateLimitResult> {
  return checkRateLimit(`apify:${userId}`, defaultApifyConfig);
}

export async function checkGeminiRateLimit(userId: string = "global"): Promise<RateLimitResult> {
  return checkRateLimit(`gemini:${userId}`, defaultGeminiConfig);
}

export async function checkUazapiRateLimit(userId: string = "global"): Promise<RateLimitResult> {
  return checkRateLimit(`uazapi:${userId}`, defaultUazapiConfig);
}
