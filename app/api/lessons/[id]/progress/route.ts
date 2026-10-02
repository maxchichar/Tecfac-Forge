import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-error";
import { getSessionState } from "@/lib/server/session";
import { setLessonProgress } from "@/lib/server/progress";
import { readRequestBodyText, parseJsonObject } from "@/lib/validation";
import { z } from "zod";

const ProgressSchema = z.object({
  completed: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to track progress.");
  }

  const { id: lessonId } = await params;
  if (!lessonId) {
    return jsonError(400, "invalid_request", "Lesson ID is required.");
  }

  const bodyText = await readRequestBodyText(req);
  if (!bodyText.ok) {
    return jsonError(413, "request_too_large", "Request body is too large.");
  }

  const parsedJson = parseJsonObject(bodyText.text);
  if (!parsedJson.ok) {
    return jsonError(400, "invalid_json", "Request body is not valid JSON.");
  }

  const parsed = ProgressSchema.safeParse(parsedJson.value);
  if (!parsed.success) {
    return jsonError(400, "invalid_request", "Field 'completed' must be a boolean.");
  }

  const result = await setLessonProgress(session.userId, lessonId, parsed.data.completed);
  if (!result.ok) {
    return jsonError(result.status, "progress_failed", result.error);
  }

  return jsonOk({
    completed: result.completed,
    completedAt: result.completedAt,
  });
}
