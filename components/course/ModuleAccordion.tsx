"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, CircleCheck, Circle } from "lucide-react";
import { cn, formatMinutes } from "@/lib/utils";

export interface ModuleLessonItem {
  id: string;
  slug: string;
  title: string;
  completed: boolean;
  estimatedMinutes: number;
}

export interface ModuleWithLessons {
  id: string;
  title: string;
  completion?: number;
  lessons: ModuleLessonItem[];
}

export function ModuleAccordion({ modules }: { modules: ModuleWithLessons[] }) {
  const [openId, setOpenId] = React.useState<string | null>(modules[0]?.id ?? null);

  return (
    <div className="space-y-2">
      {modules.map((mod, idx) => {
        const open = openId === mod.id;
        const modCompletion =
          typeof mod.completion === "number"
            ? mod.completion
            : mod.lessons.length > 0
            ? Math.round((mod.lessons.filter((l) => l.completed).length / mod.lessons.length) * 100)
            : 0;

        return (
          <div key={mod.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <button
              onClick={() => setOpenId(open ? null : mod.id)}
              className="flex w-full items-center justify-between gap-3 bg-[var(--color-surface)] px-4 py-3.5 text-left hover:bg-[var(--color-surface-hover)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-surface-hover)] text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  {idx + 1}
                </span>
                <span className="text-[13.5px] font-medium">{mod.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-tertiary)]">{modCompletion}%</span>
                <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-tertiary)] transition-transform", open && "rotate-180")} />
              </div>
            </button>
            {open && (
              <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {mod.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lesson.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] hover:bg-[var(--color-surface-hover)]"
                  >
                    <span className="flex items-center gap-2.5">
                      {lesson.completed ? (
                        <CircleCheck className="h-4 w-4 text-[var(--color-success)]" />
                      ) : (
                        <Circle className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                      )}
                      <span className={lesson.completed ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}>
                        {lesson.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">
                      {formatMinutes(lesson.estimatedMinutes)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
