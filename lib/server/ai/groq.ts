import { z } from "zod";
import { envString, DEFAULT_AI_MODEL } from "@/lib/env";
import { logger } from "@/lib/logger";
import { readRequestBodyText } from "@/lib/validation";

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export class AIUnavailableError extends Error {
  constructor(public readonly reason: "configuration" | "provider" | "response" | "budget") { super(`AI unavailable: ${reason}`); }
}
const ResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1).max(40_000) }), finish_reason: z.string().nullable().optional() })).min(1),
  usage: z.object({ prompt_tokens: z.number().nonnegative(), completion_tokens: z.number().nonnegative() }).optional(),
});

/** A single, bounded server-side call. No automatic paid retries or tool execution. */
export async function groqCompletion(options: {
  messages: AIMessage[];
  purpose: "tutor" | "extraction" | "practice" | "assessment";
  model?: string;
  json?: boolean;
  maxTokens?: number;
  fetchFn?: typeof fetch;
}): Promise<string> {
  const key = envString("GROQ_API_KEY");
  if (!key) throw new AIUnavailableError("configuration");
  const messages = options.messages;
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (chars > 36_000 || messages.length > 26) throw new AIUnavailableError("budget");
  const model = options.model ?? envString("GROQ_MODEL") ?? DEFAULT_AI_MODEL;
  const maxTokens = Math.min(options.maxTokens ?? 900, 2400);
  const started = Date.now();
  try {
    const response = await (options.fetchFn ?? fetch)(GROQ_URL, {
      method: "POST", redirect: "error",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_completion_tokens: maxTokens, temperature: 0.2, ...(model.startsWith("openai/gpt-oss-") ? { reasoning_effort: "low" } : {}), ...(options.json ? { response_format: { type: "json_object" } } : {}) }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      // Never read or log provider error bodies: they can echo prompts and secrets.
      await response.body?.cancel();
      logger.warn("ai.provider_failed", { provider: "groq", purpose: options.purpose, status: response.status });
      throw new AIUnavailableError("provider");
    }
    const body = await readRequestBodyText(response, 100_000);
    if (!body.ok) throw new AIUnavailableError("response");
    const parsed = ResponseSchema.safeParse(JSON.parse(body.text));
    if (!parsed.success || !parsed.data.choices[0].message.content.trim()) throw new AIUnavailableError("response");
    if (options.json && parsed.data.choices[0].finish_reason === "length") throw new AIUnavailableError("response");
    logger.info("ai.completed", { provider: "groq", purpose: options.purpose, model, durationMs: Date.now() - started, inputChars: chars, inputTokens: parsed.data.usage?.prompt_tokens, outputTokens: parsed.data.usage?.completion_tokens });
    return parsed.data.choices[0].message.content;
  } catch (error) {
    if (error instanceof AIUnavailableError) throw error;
    logger.warn("ai.unavailable", { provider: "groq", purpose: options.purpose, durationMs: Date.now() - started });
    throw new AIUnavailableError("provider");
  }
}
