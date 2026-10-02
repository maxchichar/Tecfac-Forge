import { createHmac } from "node:crypto";
import { envString } from "@/lib/env";
import { enforceRequestQuota } from "@/lib/server/request-quota";
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
    if (request.method === "POST") {
      // Vercel overwrites this header at its trusted edge. Do not trust client
      // forwarding headers when running directly on another host.
      const address = process.env.VERCEL === "1" ? (request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown") : "local";
      const fingerprint = createHmac("sha256", envString("BETTER_AUTH_SECRET")!).update(address).digest("hex");
      const limited = await enforceRequestQuota(`auth:${fingerprint}`, 20);
      if (limited) return limited;
    }
    const { getAuth } = await import("@/auth/auth");
    return await getAuth().handler(request);
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
