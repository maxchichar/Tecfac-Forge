import { NextRequest } from "next/server";
import { isAuthConfigured, missingAuthEnv } from "@/lib/env";
import { logger, safeErrorMessage } from "@/lib/logger";

// Better Auth catch-all route.
//
// Unlike the previous implementation (which built a handler at module load from
// a config that required env up front), this route FAILS CLOSED and stays lazy:
//   - no DATABASE_URL / BETTER_AUTH_SECRET  → 503 "not configured" (never a
//     broken half-initialized handler, never a silent pass-through)
//   - config present but the request fails  → 503 "unavailable"
//   - otherwise delegates to the shared getAuth() singleton

async function handle(request: NextRequest): Promise<Response> {
  if (!isAuthConfigured()) {
    logger.warn("auth.endpoint_not_configured", { missing: missingAuthEnv().join(",") });
    return Response.json(
      { code: "not_configured", message: "Authentication is not configured on this deployment." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { getAuth } = await import("@/auth/auth");
    return getAuth().handler(request);
  } catch (err) {
    logger.error("auth.endpoint_failed", { message: safeErrorMessage(err) });
    return Response.json(
      { code: "unavailable", message: "Authentication is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
