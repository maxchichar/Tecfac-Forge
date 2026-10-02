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
  if (bodyText.ok && bodyText.text.trim()) {
    const parsedJson = parseJsonObject(bodyText.text);
    if (parsedJson.ok) {
      const parsed = AnalyzeSchema.safeParse(parsedJson.value);
      if (parsed.success) {
        force = parsed.data.force;
      }
    }
  }

  // 3. Run intelligence extraction pipeline
  const result = await analyzeCourseIntelligence(session.userId, courseId, { force });
  if (!result.ok) {
    return jsonError(result.status, "analysis_failed", result.error);
  }

  return jsonOk({ report: result.report });
}
