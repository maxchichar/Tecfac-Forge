import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionState } from "@/lib/server/session";
import { isProduction, missingAuthEnv } from "@/lib/env";
import { AppStateScreen } from "@/components/app/AppStateScreen";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

// Authentication gate for the whole authenticated area of the app.
//
// Fail-closed state machine (each case maps to a distinct outcome — see the
// P0 report for the full matrix):
//   not_configured → DATABASE_URL / BETTER_AUTH_SECRET missing → setup screen
//   infra_error    → session lookup itself failed (DB/auth down) → unavailable
//   no_session     → redirect to /login
//   ok             → render the authenticated shell
//
// A thrown error from the session lookup is NEVER caught and treated as "no
// session": that would silently expose the app's data layer to unauthenticated
// callers whenever auth infra hiccups. Infra errors surface a controlled
// "unavailable" screen instead.

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const state = await getSessionState(await headers());

  if (state.kind === "not_configured") {
    const missing = missingAuthEnv();
    // List missing variable NAMES in dev only; production keeps a generic
    // message (operators see the detail in server logs).
    return (
      <AppStateScreen title="Tecfac Forge isn't configured yet">
        <p>
          Authentication requires environment variables that aren&apos;t set on this deployment. Follow
          the setup steps in the server log or in <code className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-[12px]">.env.example</code>,
          then restart the server.
        </p>
        {!isProduction() && missing.length > 0 && (
          <pre className="rounded-lg bg-[var(--color-surface-hover)] p-3 text-left text-[12px] leading-relaxed">
            {missing.map((name) => `${name} — required but unset`).join("\n")}
          </pre>
        )}
      </AppStateScreen>
    );
  }

  if (state.kind === "infra_error") {
    return (
      <AppStateScreen title="Authentication is temporarily unavailable">
        <p>
          We couldn&apos;t verify your session right now. Please try again in a moment. If this keeps
          happening, contact your administrator.
        </p>
      </AppStateScreen>
    );
  }

  if (state.kind === "no_session") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
