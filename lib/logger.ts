// Minimal structured logging baseline (P0).
//
// Rules:
// - Every call site must pass a stable dot-namespaced `event` and only safe
//   scalar fields. NEVER pass secrets, authorization headers, API keys, raw
//   request/response bodies, or raw user content into `fields`.
// - Output is a single JSON object per line so log aggregators can index it.
//   Levels map to the standard console methods.
//
// A full logger (pino/winston + request-id correlation + remote transport) is
// out of scope for P0; if this grows past a single file it should be replaced,
// not extended.

export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | null | undefined>;

interface LogRecord {
  ts: string;
  level: LogLevel;
  event: string;
  [field: string]: unknown;
}

function write(level: LogLevel, event: string, fields: LogFields = {}): void {
  const record: LogRecord = { ts: new Date().toISOString(), level, event };
  // Fields after ts/level/event so they read cleanly; undefined is dropped by
  // JSON.stringify anyway.
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) record[key] = value;
  }
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};

/** Extract a short, safe message from an unknown thrown value — no stack, no
 *  object properties (an Error's .message may still contain internals; treat it
 *  as log-only, never return it to clients). */
export function safeErrorMessage(err: unknown, fallback = "Unexpected internal error"): string {
  if (typeof err === "string") return err.slice(0, 300);
  if (err instanceof Error && err.message) return err.message.slice(0, 300);
  return fallback;
}
