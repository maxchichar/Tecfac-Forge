import { SignOutButton } from "@/components/SignOutButton";
import { headers } from "next/headers";
import { getSessionState } from "@/lib/server/session";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getSessionState(await headers());
  if (session.kind !== "ok") return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } });
  return <div className="mx-auto max-w-2xl"><header className="forge-project-header"><div><span className="forge-eyebrow">Workspace preferences</span><h1>Settings.</h1><p>Your account details and current workspace setup.</p></div></header><section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><h2 className="text-lg font-medium">Account</h2><dl className="my-6 space-y-5"><div><dt className="forge-muted">Name</dt><dd className="mt-1">{user?.name ?? "Not set"}</dd></div><div><dt className="forge-muted">Email</dt><dd className="mt-1 break-all">{user?.email ?? "Not set"}</dd></div></dl><SignOutButton /></section><section className="mt-6 border-t border-[var(--color-border)] py-6"><h2 className="text-lg font-medium">AI tutor</h2><p className="forge-muted mt-3">The tutor uses the workspace’s server configuration. Personal API-key settings are not available here.</p></section><section className="border-t border-[var(--color-border)] py-6"><h2 className="text-lg font-medium">Appearance</h2><p className="forge-muted mt-3">Deep Focus Flow. A slate canvas, quiet surfaces, and cyan for your next learning step.</p></section></div>;
}
