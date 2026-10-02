import { z } from "zod";

// Small, composable request-validation conventions (P0). Not a framework —
// shared building blocks for validating untrusted input at the edges.

/** A non-empty string, trimmed, capped at `max` chars. Safe to interpolate
 *  anywhere except raw HTML. */
export function boundedString(max: number, min = 1, fieldLabel = "value"): z.ZodString {
  return z
    .string()
    .trim()
    .min(min, `${fieldLabel} is required`)
    .max(max, `${fieldLabel} must be at most ${max} characters`);
}

export const MAX_JSON_BODY_BYTES = 64_000;

export type BodyTextResult =
  | { ok: true; text: string }
  | { ok: false; code: "body_too_large"; status: 413 };

/** Read a request body as text, rejecting anything over budget BEFORE parsing,
 *  so oversized payloads never reach JSON.parse or downstream work. */
export async function readRequestBodyText(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<BodyTextResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: "" };
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return { ok: false, code: "body_too_large", status: 413 };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return { ok: true, text: text + decoder.decode() };
  } finally {
    reader.releaseLock();
  }
}

export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; code: "invalid_json"; status: 400 };

/** Strict JSON.parse wrapper: never throws, returns a discriminated result. */
export function parseJsonObject(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, code: "invalid_json", status: 400 };
  }
}

/** Reusable message/context shapes for the AI chat body — kept here (not in the
 *  route) so the route stays thin and the boundary is unit-testable. */
export const MAX_CHAT_MESSAGES = 24;
export const MAX_MESSAGE_CHARS = 4_000;
export const MAX_TOTAL_INPUT_CHARS = 20_000;

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
}).strict();

const chatContextSchema = z.object({
  lessonId: boundedString(200, 1, "lessonId"),
  lessonTitle: boundedString(200, 1, "lessonTitle"),
  courseTitle: boundedString(200, 1, "courseTitle"),
  projectId: boundedString(200).optional(),
  milestoneId: boundedString(200).optional(),
}).strict();

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
  context: chatContextSchema,
}).strict();

export type ChatRequest = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  context: { lessonId: string; lessonTitle: string; courseTitle: string; projectId?: string; milestoneId?: string };
};

export type ChatBodyResult =
  | { ok: true; value: ChatRequest }
  | { ok: false; status: 400; code: "invalid_json" | "invalid_request"; message: string }
  | { ok: false; status: 413; code: "request_too_large" };

/** Validate an already-decoded chat request body. Structural problems → 400;
 *  anything that pushes the request over a hard size budget → 413 (so clients
 *  can distinguish "fix your payload" from "payload too big"). */
export function normalizeChatRequest(raw: unknown): ChatBodyResult {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, status: 400, code: "invalid_request", message: "Request body must be a JSON object." };
  }

  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = (issue?.path ?? []).join(".");
    if (issue?.code === "too_big") {
      // Array too long or a message/field too long — oversized, not malformed.
      return { ok: false, status: 413, code: "request_too_large" };
    }
    if (path === "messages" && issue?.code === "too_small") {
      return { ok: false, status: 400, code: "invalid_request", message: "messages must contain at least one message." };
    }
    return { ok: false, status: 400, code: "invalid_request", message: "Request body failed validation." };
  }

  const value = parsed.data;
  const totalChars = value.messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars > MAX_TOTAL_INPUT_CHARS) {
    return { ok: false, status: 413, code: "request_too_large" };
  }

  return { ok: true, value };
}
