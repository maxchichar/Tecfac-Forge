import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-error";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedLearningPath } from "@/lib/server/curriculum/learning-path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Session gate
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to view the learning path.");
  }

  const { id: courseId } = await params;
  if (!courseId) {
    return jsonError(400, "invalid_request", "Course ID is required.");
  }

  // 2. Fetch authorized learning path
  const report = await getAuthorizedLearningPath(session.userId, courseId);
  if (!report) {
    return jsonError(404, "not_found", "Course not found or unauthorized.");
  }

  return jsonOk({ report });
}
