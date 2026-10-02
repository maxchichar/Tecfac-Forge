import { isAuthConfigured, missingAuthEnv } from "@/lib/env";
import { logger, safeErrorMessage } from "@/lib/logger";

// Session resolution used by both the (app) layout gate and protected API
// routes. The ONLY places that may decide "is this request authenticated?".
//
// Fail-closed: any error reaching a session lookup is surfaced as a distinct
// state, never silently treated as "no session → let through" and never leaked
// to the client as an internal detail.

export type SessionState =
  | { kind: "ok"; userId: string }
  | { kind: "no_session" }
  | { kind: "not_configured" }
  | { kind: "infra_error" };

/**
 * Resolve the current request's session.
 *
 * Returns:
 * - ok           → a valid session exists (userId is set)
 * - no_session   → no/invalid session cookie — the caller should redirect/401
 * - not_configured → DATABASE_URL / BETTER_AUTH_SECRET missing → setup failure
 * - infra_error  → the session lookup itself failed (DB/auth down) → controlled
 *                  "unavailable" response, never silent access
 */
export async function getSessionState(headers: Headers): Promise<SessionState> {
  if (!isAuthConfigured()) {
    const missing = missingAuthEnv();
    logger.warn("auth.session_check_skipped_not_configured", { missing: missing.join(",") });
    return { kind: "not_configured" };
  }

  try {
    const { getAuth } = await import("@/auth/auth");
    const auth = getAuth();
    const result = await auth.api.getSession({ headers });
    if (!result || !result.session || !result.user) return { kind: "no_session" };
    return { kind: "ok", userId: result.user.id };
  } catch (err) {
    // Deliberately opaque to the client; the server log keeps the detail.
    logger.error("auth.session_check_failed", { message: safeErrorMessage(err) });
    return { kind: "infra_error" };
  }
}
