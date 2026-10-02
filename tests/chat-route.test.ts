import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// End-to-end tests for the AI chat route boundary. The session gate, rate
// limiter, and env access are all mocked so each guard can be exercised in
// isolation; fetch is stubbed per test so the provider is never contacted.

type SessionState =
  | { kind: "ok"; userId: string }
  | { kind: "no_session" }
  | { kind: "not_configured" }
  | { kind: "infra_error" };
type RateResult = { allowed: boolean; remaining: number; retryAfterSeconds?: number };

const sessionState = vi.hoisted<{ current: SessionState }>(() => ({
  current: { kind: "no_session" },
}));
const rateState = vi.hoisted<{ current: RateResult }>(() => ({
  current: { allowed: true, remaining: 30 },
}));
const envState = vi.hoisted<{ current: Record<string, string | undefined> }>(() => ({
  current: { OPENAI_API_KEY: "test-key", OPENAI_MODEL: undefined },
}));

vi.mock("@/lib/env", () => ({
  DEFAULT_AI_MODEL: "gpt-4o-mini",
  envString: (key: string) => envState.current[key] ?? undefined,
}));

vi.mock("@/lib/server/session", () => ({
  getSessionState: async () => sessionState.current,
}));

vi.mock("@/lib/rate-limit", () => ({
  aiChatRateLimiter: { check: () => rateState.current },
}));

import { POST } from "@/app/api/ai/chat/route";

const VALID_BODY = {
  messages: [{ role: "user", content: "Explain closures" }],
  context: { lessonId: "l1", lessonTitle: "HTML Fundamentals", courseTitle: "Web Development" },
};

function send(body: unknown): Promise<Response> {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return POST(new NextRequest("http://localhost/api/ai/chat", { method: "POST", body: raw }));
}

async function jsonOf(res: Response): Promise<{ code?: string; message?: string; reply?: string }> {
  return (await res.json()) as { code?: string; message?: string; reply?: string };
}

function okProvider(): typeof fetch {
  return (async () => new Response(JSON.stringify({ output_text: "Hello there" }), { status: 200 })) as typeof fetch;
}

const fetchMock = vi.fn<typeof fetch>();

describe("POST /api/ai/chat", () => {
  beforeEach(() => {
    sessionState.current = { kind: "ok", userId: "user-1" };
    rateState.current = { allowed: true, remaining: 30 };
    envState.current = { OPENAI_API_KEY: "test-key", OPENAI_MODEL: undefined };
    fetchMock.mockReset();
    fetchMock.mockImplementation(okProvider());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects unauthenticated requests", async () => {
    sessionState.current = { kind: "no_session" };
    const res = await send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toMatchObject({ code: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when auth is not configured", async () => {
    sessionState.current = { kind: "not_configured" };
    const res = await send(VALID_BODY);
    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toMatchObject({ code: "service_not_configured" });
  });

  it("returns 503 on an auth infrastructure error (never silently allows)", async () => {
    sessionState.current = { kind: "infra_error" };
    const res = await send(VALID_BODY);
    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toMatchObject({ code: "service_unavailable" });
  });

  it("returns 503 when the AI provider key is missing (no stub answers)", async () => {
    envState.current = { OPENAI_API_KEY: undefined, OPENAI_MODEL: undefined };
    const res = await send(VALID_BODY);
    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toMatchObject({ code: "ai_not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized request body before parsing", async () => {
    const res = await send("x".repeat(100_000));
    expect(res.status).toBe(413);
  });

  it("rejects malformed JSON", async () => {
    const res = await send("{not json");
    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toMatchObject({ code: "invalid_json" });
  });

  it("rejects a structurally invalid request", async () => {
    const res = await send({ messages: "not-an-array", context: {} });
    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toMatchObject({ code: "invalid_request" });
  });

  it("rejects an oversized single message with 413", async () => {
    const res = await send({
      messages: [{ role: "user", content: "a".repeat(4001) }],
      context: { lessonId: "l1", lessonTitle: "L", courseTitle: "C" },
    });
    expect(res.status).toBe(413);
  });

  it("rejects a client-supplied model (server controls the model)", async () => {
    const body = { ...VALID_BODY, model: "gpt-4-turbo" };
    const res = await send(body);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    rateState.current = { allowed: false, remaining: 0, retryAfterSeconds: 17 };
    const res = await send(VALID_BODY);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("17");
    expect(await jsonOf(res)).toMatchObject({ code: "rate_limited" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a successful provider reply", async () => {
    const res = await send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(await jsonOf(res)).toEqual({ reply: "Hello there" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps a provider HTTP error to a safe 502 (no provider internals leaked)", async () => {
    fetchMock.mockImplementation(
      (() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: "quota-breach-secret" } }), { status: 500 })
        )) as typeof fetch
    );
    const res = await send(VALID_BODY);
    expect(res.status).toBe(502);
    const body = await jsonOf(res);
    expect(body.code).toBe("ai_provider_error");
    expect(JSON.stringify(body)).not.toContain("quota-breach-secret");
  });

  it("maps a network failure to a safe 502", async () => {
    fetchMock.mockImplementation((() => Promise.reject(new Error("socket hang up"))) as typeof fetch);
    const res = await send(VALID_BODY);
    expect(res.status).toBe(502);
    const body = await jsonOf(res);
    expect(body.code).toBe("ai_provider_error");
    expect(JSON.stringify(body)).not.toContain("socket hang up");
  });

  it("rejects an unauthorized or nonexistent lessonId with 404", async () => {
    const res = await send({
      messages: [{ role: "user", content: "Explain closures" }],
      context: { lessonId: "nonexistent-or-unauthorized-id", lessonTitle: "Custom", courseTitle: "Course" },
    });
    expect(res.status).toBe(404);
    const body = await jsonOf(res);
    expect(body.code).toBe("lesson_not_found");
  });
});
