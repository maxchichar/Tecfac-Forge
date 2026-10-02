import { z } from "zod";
import { getSessionState } from "@/lib/server/session";
import { saveLessonLibrary, LibraryAccessError } from "@/lib/server/library";
import { readRequestBodyText, parseJsonObject } from "@/lib/validation";
import { jsonError } from "@/lib/api-error";
const schema = z.object({ content: z.string().max(20_000).optional(), bookmarked: z.boolean().optional() }).strict().refine(x => x.content !== undefined || x.bookmarked !== undefined);
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionState(request.headers);
  if (session.kind !== "ok") return jsonError(session.kind === "no_session" ? 401 : 503, "unavailable", "Please sign in or try again shortly.");
  try {
    const body = await readRequestBodyText(request, 90_000);
    if (!body.ok) return jsonError(413, "body_too_large", "This note is too long.");
    const json = parseJsonObject(body.text);
    const parsed = schema.safeParse(json.ok ? json.value : null);
    if (!parsed.success) return jsonError(400, "invalid_request", "Check your note and try again (20,000 characters maximum).");
    await saveLessonLibrary(session.userId, (await params).id, parsed.data);
    return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LibraryAccessError) return jsonError(404, "not_found", "Lesson not found.");
    return jsonError(503, "unavailable", "Your changes could not be saved. Please try again.");
  }
}
