import { beforeEach, describe, expect, it, vi } from "vitest";

// Drives getSessionState through all four fail-closed outcomes by mocking the
// two modules it depends on: the env availability flag and the lazy auth import.

const envFlag = vi.hoisted(() => ({ configured: false }));
const authImpl = vi.hoisted<{ current: (() => Promise<unknown>) | null }>(() => ({ current: null }));

vi.mock("@/lib/env", () => ({
  isAuthConfigured: () => envFlag.configured,
  missingAuthEnv: () => (envFlag.configured ? [] : ["DATABASE_URL", "BETTER_AUTH_SECRET"]),
}));

vi.mock("@/auth/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: () => (authImpl.current ? authImpl.current() : Promise.resolve(null)),
    },
  }),
}));

import { getSessionState } from "@/lib/server/session";

describe("getSessionState (fail-closed session gate)", () => {
  beforeEach(() => {
    envFlag.configured = true;
    authImpl.current = null;
  });

  it("returns not_configured when the required env is missing", async () => {
    envFlag.configured = false;
    const state = await getSessionState(new Headers());
    expect(state.kind).toBe("not_configured");
  });

  it("returns no_session when there is no session", async () => {
    authImpl.current = () => Promise.resolve(null);
    const state = await getSessionState(new Headers());
    expect(state.kind).toBe("no_session");
  });

  it("returns ok with the user id for a valid session", async () => {
    authImpl.current = () => Promise.resolve({ session: { id: "s1" }, user: { id: "user-1" } });
    const state = await getSessionState(new Headers());
    expect(state).toEqual({ kind: "ok", userId: "user-1" });
  });

  it("returns infra_error when the session lookup throws — never 'no session'", async () => {
    authImpl.current = () => Promise.reject(new Error("db connection refused"));
    const state = await getSessionState(new Headers());
    expect(state.kind).toBe("infra_error");
  });
});
