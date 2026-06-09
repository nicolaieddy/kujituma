// Shared rate-limit backoff helpers for Garmin's unofficial bridge.
// Garmin throttles aggressively (429) on login and bulk reads. These helpers
// add jittered exponential backoff so a single sync invocation doesn't fail
// permanently after the first 429.

export function is429(err: unknown): boolean {
  const m = (err as Error)?.message ?? String(err);
  return /\b429\b|too many requests|rate limit/i.test(m);
}

export interface BackoffOptions {
  /** Human-readable label for log lines. */
  label?: string;
  /** Max retry attempts after the first try (default 3 → up to 4 total calls). */
  retries?: number;
  /** Initial delay in ms before the first retry (default 8000). */
  baseMs?: number;
  /** Max single delay in ms (default 90000). */
  maxMs?: number;
  /** Multiplier per attempt (default 2). */
  factor?: number;
  /** Predicate to decide if an error should trigger a retry (default: 429 only). */
  shouldRetry?: (err: unknown) => boolean;
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions = {},
): Promise<T> {
  const {
    label = "garmin-call",
    retries = 3,
    baseMs = 8000,
    maxMs = 90000,
    factor = 2,
    shouldRetry = is429,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(err) || attempt === retries) throw err;
      const raw = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
      const jitter = Math.floor(Math.random() * (raw * 0.3));
      const delay = raw + jitter;
      console.warn(
        `[backoff] ${label} attempt ${attempt + 1}/${retries + 1} hit rate limit; sleeping ${Math.round(delay / 1000)}s`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Light pacing delay used between successful Garmin calls. */
export function paceDelay(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 400);
  return new Promise((r) => setTimeout(r, ms + jitter));
}
