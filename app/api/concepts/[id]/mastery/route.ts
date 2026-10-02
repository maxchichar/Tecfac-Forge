import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-error";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedConceptMastery } from "@/lib/server/assessment/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to view concept mastery.");
  }

  const { id: conceptId } = await params;
  if (!conceptId) {
    return jsonError(400, "invalid_request", "Concept ID is required.");
  }

  const mastery = await getAuthorizedConceptMastery(session.userId, conceptId);
  if (!mastery) {
    return jsonError(404, "not_found", "Concept not found or unauthorized.");
  }

  return jsonOk({ mastery });
}
