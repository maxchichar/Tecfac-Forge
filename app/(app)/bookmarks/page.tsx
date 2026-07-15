import Link from "next/link";
import { Bookmark as BookmarkIcon, FileText, FolderKanban, Hash } from "lucide-react";
import { bookmarks } from "@/lib/mock-data";
import { Card } from "@/components/ui/Card";

const ICONS = { lesson: FileText, project: FolderKanban, section: Hash } as const;

export default function BookmarksPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <BookmarkIcon className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
      </div>

      <div className="mt-6 space-y-3">
        {bookmarks.map((b) => {
          const Icon = ICONS[b.type];
          return (
            <Link key={b.id} href={b.href}>
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-[var(--color-surface-hover)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)]">
                  <Icon className="h-4 w-4 text-[var(--color-accent-solid)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{b.title}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{b.courseTitle}</p>
                </div>
                <span className="shrink-0 text-xs capitalize text-[var(--color-text-tertiary)]">{b.type}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
