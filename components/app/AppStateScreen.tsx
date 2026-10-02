import { ShieldAlert } from "lucide-react";

// Full-viewport state screen shown by the (app) layout when the app cannot
// safely render the authenticated shell (setup/config failure or a transient
// auth-infrastructure error). Rendered server-side; no session or data access.
// Copy stays generic in production — internals live in server logs only.

export function AppStateScreen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface-hover)]">
          <ShieldAlert className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h1>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {children}
        </div>
      </div>
    </div>
  );
}
