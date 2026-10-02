import { describe, expect, it } from "vitest";
import {
  normalizeChatRequest,
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_TOTAL_INPUT_CHARS,
} from "@/lib/validation";

const validContext = { lessonId: "l1", lessonTitle: "Lesson", courseTitle: "Course" };

function validBody(overrides: Record<string, unknown> = {}) {
  return { messages: [{ role: "user", content: "hello" }], context: validContext, ...overrides };
}

describe("normalizeChatRequest", () => {
  it("accepts a well-formed request", () => {
    const result = normalizeChatRequest(validBody());
    expect(result.ok).toBe(true);
  });

  it("rejects a non-object body", () => {
    const result = normalizeChatRequest("nope");
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects an unknown message role", () => {
    const body = validBody();
    (body.messages as unknown[])[0] = { role: "system", content: "hi" };
    const result = normalizeChatRequest(body);
    expect(result).toMatchObject({ ok: false, status: 400, code: "invalid_request" });
  });

  it("rejects unsupported top-level keys", () => {
    const result = normalizeChatRequest(validBody({ model: "gpt-4o" }));
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects an empty messages array", () => {
    const result = normalizeChatRequest(validBody({ messages: [] }));
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects missing context fields", () => {
    const result = normalizeChatRequest({ messages: [{ role: "user", content: "hi" }] });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("flags an oversized single message as 413", () => {
    const body = validBody();
    body.messages = [{ role: "user", content: "a".repeat(MAX_MESSAGE_CHARS + 1) }];
    const result = normalizeChatRequest(body);
    expect(result).toMatchObject({ ok: false, status: 413, code: "request_too_large" });
  });

  it("flags too many messages as 413", () => {
    const many = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, () => ({ role: "user" as const, content: "hi" }));
    const result = normalizeChatRequest(validBody({ messages: many }));
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it("flags an over-budget total input as 413", () => {
    // Individually small messages that together exceed the total budget.
    const each = Math.ceil(MAX_TOTAL_INPUT_CHARS / MAX_CHAT_MESSAGES) + 1;
    const many = Array.from({ length: MAX_CHAT_MESSAGES }, () => ({
      role: "user" as const,
      content: "a".repeat(each),
    }));
    const result = normalizeChatRequest(validBody({ messages: many }));
    expect(result).toMatchObject({ ok: false, status: 413 });
  });
});
