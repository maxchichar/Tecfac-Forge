import { z } from "zod";
import { getSessionState } from "@/lib/server/session";
import { jsonError, jsonOk } from "@/lib/api-error";
import { readRequestBodyText, parseJsonObject } from "@/lib/validation";
import { enforceRequestQuota } from "@/lib/server/request-quota";
import { logger, safeErrorMessage } from "@/lib/logger";
import { ProjectError } from "./service";



export async function projectMutation<T>(req: Request, schema: z.ZodType<T>, action: (userId: string, input: T) => Promise<unknown>) {
  try {
    const session = await getSessionState(req.headers);
    if (session.kind !== "ok") return jsonError(session.kind === "no_session" ? 401 : 503, "session_unavailable", "Sign in to continue. If sign-in is unavailable, try again shortly.");
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return jsonError(403, "invalid_origin", "Request origin is not permitted.");
    const limited = await enforceRequestQuota(`project:${session.userId}`, 20);
    if (limited) return limited;
    const body = await readRequestBodyText(req);
    if (!body.ok) return jsonError(413, "request_too_large", "Submission is too large.");
    const json = parseJsonObject(body.text);
    if (!json.ok) return jsonError(400, "invalid_json", "Invalid request.");
    const input = schema.safeParse(json.value);
    if (!input.success) return jsonError(400, "invalid_request", input.error.issues[0]?.message ?? "Check the form fields.");
    return jsonOk(await action(session.userId, input.data));
  } catch (error) {
    if (error instanceof ProjectError) return jsonError(error.status, "project_request_failed", error.message);
    logger.error("project.request_failed", { message: safeErrorMessage(error) });
    return jsonError(503, "project_unavailable", "Projects are temporarily unavailable. Your unsent work is still in the form.");
  }
}
