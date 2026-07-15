"use client";

import * as React from "react";
import { Check } from "lucide-react";

export function NotesPanel({ initialValue = "" }: { initialValue?: string }) {
  const [value, setValue] = React.useState(initialValue);
  const [saved, setSaved] = React.useState(true);

  React.useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => setSaved(true), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Your notes
        </p>
        <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
          {saved ? (
            <>
              <Check className="h-3 w-3 text-[var(--color-success)]" /> Saved
            </>
          ) : (
            "Saving…"
          )}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Jot down anything worth remembering — this is linked to this lesson and searchable later."
        rows={6}
        className="w-full resize-none bg-transparent text-[13px] text-[var(--color-text-secondary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
      />
    </div>
  );
}
