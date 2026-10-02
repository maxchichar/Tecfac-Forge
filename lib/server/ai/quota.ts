import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { envString } from "@/lib/env";
import { jsonError } from "@/lib/api-error";
import { logger } from "@/lib/logger";

export class QuotaExceeded extends Error {
  constructor(public retryAfter: number) { super("Usage limit reached"); }
}
export interface Quota { key: string; max: number; windowSeconds: number }
/** PostgreSQL serializes each key's UPSERT. All counters roll back if any limit fails. */
export async function consumeQuotas(quotas: Quota[]): Promise<void> {
  const schema = new URL(process.env.DATABASE_URL!).searchParams.get("schema") ?? "public";
  const table = Prisma.raw(`"${schema.replaceAll('"', '""')}"."UsageQuota"`);
  await prisma.$transaction(async (tx) => {
    for (const quota of [...quotas].sort((a, b) => a.key.localeCompare(b.key))) {
      const rows = await tx.$queryRaw<{ count: number }[]>`
        INSERT INTO ${table} AS quota ("key", "count", "expiresAt")
        VALUES (${quota.key}, 1, CURRENT_TIMESTAMP + ${quota.windowSeconds} * INTERVAL '1 second')
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN quota."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE quota."count" + 1 END,
          "expiresAt" = CASE WHEN quota."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ${quota.windowSeconds} * INTERVAL '1 second' ELSE quota."expiresAt" END
        WHERE quota."expiresAt" <= CURRENT_TIMESTAMP OR quota."count" < ${quota.max}
        RETURNING "count"
      `;
      if (!rows.length) {
        const row = await tx.usageQuota.findUnique({ where: { key: quota.key }, select: { expiresAt: true } });
        throw new QuotaExceeded(Math.max(1, Math.ceil(((row?.expiresAt.getTime() ?? Date.now() + 60_000) - Date.now()) / 1000)));
      }
    }
  }, { timeout: 20_000, maxWait: 20_000 });
}

export async function enforceAIQuota(userId: string): Promise<Response | null> {
  try {
    await consumeQuotas([
      { key: `ai:minute:${userId}`, max: 8, windowSeconds: 60 },
      { key: `ai:day:${userId}`, max: Number(envString("AI_DAILY_USER_LIMIT") ?? 60), windowSeconds: 86400 },
      { key: "ai:global:day", max: Number(envString("AI_DAILY_GLOBAL_LIMIT") ?? 1000), windowSeconds: 86400 },
    ]);
    return null;
  } catch (error) {
    if (error instanceof QuotaExceeded) return jsonError(429, "rate_limited", "You’ve reached the current AI usage limit. You can still read sources and work on your project; try the tutor again later.", { "Retry-After": String(error.retryAfter) });
    logger.error("ai.quota_unavailable");
    return jsonError(503, "service_unavailable", "AI usage checks are temporarily unavailable. Please try again shortly.");
  }
}
