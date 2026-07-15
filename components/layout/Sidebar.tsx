"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Bookmark,
  NotebookPen,
  Settings,
  Sparkles,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { courses } from "@/lib/mock-data";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace", label: "Workspace", icon: Compass },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] lg:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Tecfac Forge</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2 pt-4">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Your courses
        </p>
        <div className="space-y-0.5">
          {courses.map((course) => {
            const active = pathname === `/course/${course.slug}`;
            return (
              <Link
                key={course.id}
                href={`/course/${course.slug}`}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <span className="truncate">{course.title}</span>
                <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">{course.completion}%</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-[var(--color-border)] p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13.5px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
