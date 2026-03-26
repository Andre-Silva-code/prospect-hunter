type RateLimiterConfig = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, config: RateLimiterConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = buckets.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = timestamps[0]!;
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function resetAllRateLimits(): void {
  buckets.clear();
}

const defaultApifyConfig: RateLimiterConfig = {
  maxRequests: parseInt(process.env.APIFY_RATE_LIMIT_MAX ?? "10", 10) || 10,
  windowMs: parseInt(process.env.APIFY_RATE_LIMIT_WINDOW_MS ?? "60000", 10) || 60000,
};

const defaultGeminiConfig: RateLimiterConfig = {
  maxRequests: parseInt(process.env.GEMINI_RATE_LIMIT_MAX ?? "30", 10) || 30,
  windowMs: parseInt(process.env.GEMINI_RATE_LIMIT_WINDOW_MS ?? "60000", 10) || 60000,
};

export function checkApifyRateLimit(userId: string = "global"): RateLimitResult {
  return checkRateLimit(`apify:${userId}`, defaultApifyConfig);
}

export function checkGeminiRateLimit(userId: string = "global"): RateLimitResult {
  return checkRateLimit(`gemini:${userId}`, defaultGeminiConfig);
}
