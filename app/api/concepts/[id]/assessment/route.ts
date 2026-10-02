import { enforceAIQuota } from "@/lib/server/ai/quota";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-error";
import { getSessionState } from "@/lib/server/session";
import {
  getAuthorizedConceptAssessment,
  submitAuthorizedAssessmentAttempt,
  getAuthorizedConceptMastery,
} from "@/lib/server/assessment/service";
import { readRequestBodyText, parseJsonObject } from "@/lib/validation";
import { z } from "zod";

const AssessmentSubmitSchema = z.object({
  response: z.string().min(1, "Response cannot be empty").max(10_000, "Response too long"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to view assessments.");
  }

  const { id: conceptId } = await params;
  if (!conceptId) {
    return jsonError(400, "invalid_request", "Concept ID is required.");
  }

  const assessment = await getAuthorizedConceptAssessment(session.userId, conceptId);
  if (!assessment) {
    return jsonError(404, "not_found", "Concept not found or unauthorized.");
  }

  const mastery = await getAuthorizedConceptMastery(session.userId, conceptId);

  return jsonOk({ assessment, mastery });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to submit assessment.");
  }

  const { id: conceptId } = await params;
  if (!conceptId) {
    return jsonError(400, "invalid_request", "Concept ID is required.");
  }

  const bodyText = await readRequestBodyText(req);
  if (!bodyText.ok) {
    return jsonError(bodyText.status, bodyText.code, "Request body is too large.");
  }

  const parsedJson = parseJsonObject(bodyText.text);
  if (!parsedJson.ok) {
    return jsonError(parsedJson.status, parsedJson.code, "Invalid JSON in request body.");
  }

  const parsed = AssessmentSubmitSchema.safeParse(parsedJson.value);
  if (!parsed.success) {
    return jsonError(400, "invalid_request", parsed.error.issues[0]?.message || "Invalid submission");
  }

  const quotaError = await enforceAIQuota(session.userId);
  if (quotaError) return quotaError;

  const result = await submitAuthorizedAssessmentAttempt(
    session.userId,
    conceptId,
    parsed.data.response
  );

  if (!result.ok) {
    return jsonError(result.status, "assessment_failed", result.error);
  }

  return jsonOk({
    evaluation: result.evaluation,
    attemptId: result.attemptId,
  });
}
