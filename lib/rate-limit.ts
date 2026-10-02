// Basic in-memory, per-key fixed-window rate limiting (P0 app-level abuse
// protection).
//
// Trade-offs, stated up front:
// - In-memory only: state is per-process. Behind multiple server instances this
//   under-limits (each box keeps its own counter), so it must NOT be relied on
//   as the sole control at scale — replace with a shared store (Redis etc.)
//   when the app runs more than one instance. Until then the budget is applied
//   honestly per instance and the limitation is documented (see completion
//   report). No Redis/K8s were introduced because P0 explicitly forbids new
//   distributed infrastructure.
// - Fixed window (not sliding) is deliberately simple and testable; a per-user
//   60s window is plenty coarse for chat-rate abuse on a single instance.
// - Entries are pruned lazily so the map can't grow without bound.

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs?: number;
  /** Maximum number of allowed calls per key per window. */
  max?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Remaining budget in the current window (0 when not allowed). */
  remaining: number;
  /** Seconds the caller should wait before retrying (set when not allowed). */
  retryAfterSeconds?: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly hits = new Map<string, Entry>();

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.max = options.max ?? 30;
  }

  check(key: string): RateLimitDecision {
    const now = Date.now();
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count += 1;

    if (this.hits.size > 10_000) this.prune(now);

    const allowed = entry.count <= this.max;
    return {
      allowed,
      remaining: Math.max(0, this.max - entry.count),
      retryAfterSeconds: allowed
        ? undefined
        : Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  private prune(now: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }

  /** Test hook. */
  reset(): void {
    this.hits.clear();
  }
}

/** Shared limiter for the AI chat endpoint (keyed by authenticated user id). */
export const aiChatRateLimiter = new FixedWindowRateLimiter({ windowMs: 60_000, max: 30 });

/** Shared limiter for the course import endpoint (keyed by authenticated user id). */
export const courseImportRateLimiter = new FixedWindowRateLimiter({ windowMs: 60_000, max: 10 });
