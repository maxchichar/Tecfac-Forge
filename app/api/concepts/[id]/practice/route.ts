import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-error";
import { getSessionState } from "@/lib/server/session";
import {
  getAuthorizedConceptPractice,
  submitAuthorizedPracticeAttempt,
  getAuthorizedPracticeHistory,
} from "@/lib/server/practice/service";
import { readRequestBodyText, parseJsonObject } from "@/lib/validation";
import { z } from "zod";

const PracticeSubmitSchema = z.object({
  response: z.string().min(1, "Response cannot be empty").max(10_000, "Response too long"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to view practice tasks.");
  }

  const { id: conceptId } = await params;
  if (!conceptId) {
    return jsonError(400, "invalid_request", "Concept ID is required.");
  }

  const practice = await getAuthorizedConceptPractice(session.userId, conceptId);
  if (!practice) {
    return jsonError(404, "not_found", "Concept not found or unauthorized.");
  }

  const history = (await getAuthorizedPracticeHistory(session.userId, conceptId)) || [];

  return jsonOk({ practice, history });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to submit practice.");
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

  const parsed = PracticeSubmitSchema.safeParse(parsedJson.value);
  if (!parsed.success) {
    return jsonError(400, "invalid_request", parsed.error.issues[0]?.message || "Invalid submission");
  }

  const result = await submitAuthorizedPracticeAttempt(session.userId, conceptId, parsed.data.response);
  if (!result.ok) {
    return jsonError(result.status, "submission_failed", result.error);
  }

  return jsonOk({
    evaluation: result.evaluation,
    attemptId: result.attemptId,
  });
}
