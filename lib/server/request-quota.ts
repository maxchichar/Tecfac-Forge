import { consumeQuotas, QuotaExceeded } from "@/lib/server/ai/quota";
import { jsonError } from "@/lib/api-error";
export async function enforceRequestQuota(key: string, max: number, seconds = 60): Promise<Response | null> {
  try { await consumeQuotas([{ key, max, windowSeconds: seconds }]); return null; }
  catch (error) {
    if (error instanceof QuotaExceeded) return jsonError(429, "rate_limited", "Please wait before trying again.", { "Retry-After": String(error.retryAfter) });
    return jsonError(503, "unavailable", "Request checks are temporarily unavailable. Please try again shortly.");
  }
}
