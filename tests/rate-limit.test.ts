import { afterEach, describe, expect, it, vi } from "vitest";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

describe("FixedWindowRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the max per window then blocks", () => {
    const limiter = new FixedWindowRateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    const blocked = limiter.check("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keys are independent", () => {
    const limiter = new FixedWindowRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.check("a");
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const limiter = new FixedWindowRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:01.000Z"));
    expect(limiter.check("k").allowed).toBe(true);
  });

  it("reset() clears counters", () => {
    const limiter = new FixedWindowRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.check("k");
    limiter.reset();
    expect(limiter.check("k").allowed).toBe(true);
  });
});
