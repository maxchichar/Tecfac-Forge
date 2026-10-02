import { NextResponse } from "next/server";

// Safe, non-leaky JSON error responses for API routes.
//
// Shape is intentionally uniform — `{ code, message }` — where `code` is a
// stable machine-readable slug and `message` is a short, user-safe phrase that
// NEVER contains stack traces, connection strings, provider internals, API
// keys, or echoed request content. Log the rich detail server-side instead
// (see lib/logger.ts).

export interface ApiErrorBody {
  code: string;
  message: string;
}

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonError(
  status: number,
  code: string,
  message: string,
  extraHeaders?: Record<string, string>
): NextResponse {
  const body: ApiErrorBody = { code, message };
  return NextResponse.json(body, {
    status,
    headers: extraHeaders ? { ...NO_STORE, ...extraHeaders } : NO_STORE,
  });
}

export function jsonOk<T>(body: T, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(body, {
    headers: extraHeaders ? { ...NO_STORE, ...extraHeaders } : NO_STORE,
  });
}
