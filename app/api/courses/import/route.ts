import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-error";
import { getSessionState } from "@/lib/server/session";
import { getOrCreateUserWorkspace } from "@/lib/server/workspace";
import { ingestGitHubRepoToDatabase } from "@/lib/server/importers/github";
import { readRequestBodyText, parseJsonObject } from "@/lib/validation";
import { courseImportRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const ImportSchema = z.object({
  url: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  // 1. Session gate
  const session = await getSessionState(req.headers);
  if (session.kind !== "ok") {
    return jsonError(401, "unauthenticated", "You must sign in to import a course.");
  }

  // 2. Abuse protection (rate limit per authenticated user)
  const rate = courseImportRateLimiter.check(`user:${session.userId}`);
  if (!rate.allowed) {
    return jsonError(429, "rate_limited", "Too many import requests. Please wait a moment before importing another repository.", {
      "Retry-After": String(rate.retryAfterSeconds ?? 1),
    });
  }

  // 2. Validate body
  const bodyText = await readRequestBodyText(req);
  if (!bodyText.ok) {
    return jsonError(413, "request_too_large", "Request body is too large.");
  }

  const parsedJson = parseJsonObject(bodyText.text);
  if (!parsedJson.ok) {
    return jsonError(400, "invalid_json", "Request body is not valid JSON.");
  }

  const parsed = ImportSchema.safeParse(parsedJson.value);
  if (!parsed.success) {
    return jsonError(400, "invalid_request", "A valid GitHub repository URL is required.");
  }

  // 3. Resolve user's workspace
  const workspace = await getOrCreateUserWorkspace(session.userId);

  // 4. Ingest repository
  const result = await ingestGitHubRepoToDatabase(workspace.id, parsed.data.url);
  if (!result.ok) {
    return jsonError(result.status, "import_failed", result.error);
  }

  return jsonOk({
    courseSlug: result.courseSlug,
    courseId: result.courseId,
  });
}
