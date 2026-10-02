import { z } from "zod";

// Central, zod-validated access to environment variables.
//
// Security rules for this module (P0 hardening):
// - No security-relevant `process.env.*` reads anywhere else. Everything goes
//   through here so a missing/malformed value is caught in exactly one place.
// - Reading env is LAZY. Nothing runs at import time, which keeps `next build`
//   (runs with NODE_ENV=production and, in this repo, no .env file present) and
//   unit tests deterministic. Call sites decide when a value is *required*.
// - Never log or return secret values — only presence/shape decisions. This
//   module never echoes a value back.
// - Shape validation only (present, long enough, is a URL). "Does it actually
//   connect / authenticate" is a liveness concern handled at the call site so
//   failures stay classified (see lib/server/session.ts and the auth gate).

export const SECRET_MIN_LENGTH = 32;

/** Canonical model used by the AI tutor when GROQ_MODEL is not set. */
export const DEFAULT_AI_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_FAST_AI_MODEL = "openai/gpt-oss-20b";

/** Per-field zod validators. Absent/empty is handled separately (see parseEnv);
 *  these only run when a value is present, so "malformed" stays distinguishable
 *  from "never configured". */
const fieldValidators: Record<string, z.ZodString> = {
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(SECRET_MIN_LENGTH),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1),
  GROQ_FAST_MODEL: z.string().min(1),
  AI_DAILY_USER_LIMIT: z.string().regex(/^[1-9][0-9]{0,4}$/),
  AI_DAILY_GLOBAL_LIMIT: z.string().regex(/^[1-9][0-9]{0,6}$/),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
};

export type EnvKey = keyof typeof fieldValidators;

/** Env keys without which authentication cannot work at all. */
export const AUTH_REQUIRED_ENV: readonly EnvKey[] = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
] as const;

export interface EnvIssue {
  varName: EnvKey;
  reason: "missing" | "invalid";
  detail: string | null;
}

export interface ParsedEnv {
  values: Partial<Record<EnvKey, string>>;
  issues: EnvIssue[];
}

function describeZodError(validator: z.ZodString, value: string): string | null {
  const result = validator.safeParse(value);
  if (result.success) return null;
  const issue = result.error.issues[0];
  if (!issue) return "invalid value";
  if (issue.code === "too_small" && "minimum" in issue) {
    return `must be at least ${issue.minimum} characters`;
  }
  return issue.message;
}

/** Pure, testable parse of a raw env map into { values, issues }. */
export function parseEnv(raw: Record<string, string | undefined> = process.env): ParsedEnv {
  const values: ParsedEnv["values"] = {};
  const issues: EnvIssue[] = [];
  for (const name of Object.keys(fieldValidators) as EnvKey[]) {
    const rawValue = raw[name];
    if (rawValue === undefined || rawValue === "") {
      issues.push({ varName: name, reason: "missing", detail: null });
      continue;
    }
    const detail = describeZodError(fieldValidators[name], rawValue);
    if (detail === null) {
      values[name] = rawValue;
    } else {
      issues.push({ varName: name, reason: "invalid", detail });
    }
  }
  return { values, issues };
}

// --- Cached accessors for the running process (server-only call sites). ------

let cached: ParsedEnv | null = null;

/** Parsed snapshot of the current process env. Server-only by convention. */
export function getEnv(): ParsedEnv {
  if (cached === null) cached = parseEnv();
  return cached;
}

/** Test hook — clear the process-level cache between env mutations. */
export function resetEnvCache(): void {
  cached = null;
}

export function envString(key: EnvKey): string | undefined {
  return getEnv().values[key];
}

/** True only when every key required for auth is present and well-formed. */
export function isAuthConfigured(): boolean {
  const parsed = getEnv();
  return AUTH_REQUIRED_ENV.every((key) => parsed.values[key] !== undefined);
}

/** Keys required for auth that are missing/malformed right now (empty == ok). */
export function missingAuthEnv(): EnvKey[] {
  const parsed = getEnv();
  return AUTH_REQUIRED_ENV.filter((key) => parsed.values[key] === undefined);
}

/** True when an Groq key is configured (chat available). */
export function isAiConfigured(): boolean {
  return getEnv().values.GROQ_API_KEY !== undefined;
}

/** Canonical deployment URL (server side) — BETTER_AUTH_URL, else NEXT_PUBLIC_APP_URL. */
export function serverBaseUrl(): string | undefined {
  const parsed = getEnv();
  return parsed.values.BETTER_AUTH_URL ?? parsed.values.NEXT_PUBLIC_APP_URL;
}

export type RuntimeEnv = "development" | "test" | "production";

export function currentEnv(): RuntimeEnv {
  const v = process.env.NODE_ENV;
  if (v === "production" || v === "test") return v;
  return "development";
}

export function isProduction(): boolean {
  return currentEnv() === "production";
}
