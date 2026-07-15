import { NotebookPen } from "lucide-react";
import { notes } from "@/lib/mock-data";
import { Card } from "@/components/ui/Card";

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
        Markdown notes, autosaved and linked back to their lesson.
      </p>

      <div className="mt-6 space-y-3">
        {notes.map((n) => (
          <Card key={n.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-medium">{n.lessonTitle}</p>
              <span className="text-xs text-[var(--color-text-tertiary)]">{n.courseTitle}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{n.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
