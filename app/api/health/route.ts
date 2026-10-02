import { prisma } from "@/lib/prisma";
import { isAuthConfigured, isAiConfigured } from "@/lib/env";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (!isAuthConfigured() || !isAiConfigured()) throw new Error("Configuration incomplete");
    // Verifies the release's newest table is present, not merely database reachability.
    await prisma.usageQuota.findFirst({ select: { key: true } });
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
