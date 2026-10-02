BEGIN;
CREATE TABLE "UsageQuota" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageQuota_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "UsageQuota_count_nonnegative" CHECK ("count" >= 0)
);
CREATE INDEX "UsageQuota_expiresAt_idx" ON "UsageQuota"("expiresAt");
COMMIT;
