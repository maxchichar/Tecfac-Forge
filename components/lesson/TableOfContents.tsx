import type { TocEntry } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <nav className="sticky top-24 space-y-1 text-[13px]">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
        On this page
      </p>
      {entries.map((e) => (
        <a
          key={e.id}
          href={`#${e.id}`}
          className={cn(
            "block truncate text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            e.depth === 1 && "font-medium text-[var(--color-text-primary)]",
            e.depth === 2 && "pl-3",
            e.depth === 3 && "pl-6 text-[12px] text-[var(--color-text-tertiary)]"
          )}
        >
          {e.text}
        </a>
      ))}
    </nav>
  );
}
