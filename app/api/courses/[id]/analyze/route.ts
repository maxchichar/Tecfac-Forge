import { enforceAIQuota } from "@/lib/server/ai/quota";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-error";
import { getSessionState } from "@/lib/server/session";
import { analyzeCourseIntelligence } from "@/lib/server/intelligence/pipeline";
import { readRequestBodyText, parseJsonObject } from "@/lib/validation";
import { z } from "zod";

const AnalyzeSchema = z.object({
  force: z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Session gate
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to analyze course intelligence.");
  }

  const { id: courseId } = await params;
  if (!courseId) {
    return jsonError(400, "invalid_request", "Course ID is required.");
  }

  // 2. Parse optional force body
  let force = false;
  const bodyText = await readRequestBodyText(req);
  if (!bodyText.ok) return jsonError(413, "request_too_large", "Request body is too large.");
  if (bodyText.text.trim()) {
    const parsedJson = parseJsonObject(bodyText.text);
    if (!parsedJson.ok) return jsonError(400, "invalid_json", "Invalid JSON.");
    const parsed = AnalyzeSchema.safeParse(parsedJson.value);
    if (!parsed.success) return jsonError(400, "invalid_request", "Invalid analysis request.");
    force = parsed.data.force;
  }

  // 3. Run intelligence extraction pipeline
  const quotaError = await enforceAIQuota(session.userId);
  if (quotaError) return quotaError;

  const result = await analyzeCourseIntelligence(session.userId, courseId, { force });
  if (!result.ok) {
    return jsonError(result.status, "analysis_failed", result.error);
  }

  return jsonOk({ report: result.report });
}
