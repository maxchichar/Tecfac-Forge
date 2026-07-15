"use client";

import * as React from "react";
import Link from "next/link";
import { Search as SearchIcon, BookOpen, FileText, FolderKanban, NotebookPen } from "lucide-react";
import { courses, lessons, projects, notes } from "@/lib/mock-data";

export default function SearchPage() {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const results = q
    ? {
        courses: courses.filter((c) => c.title.toLowerCase().includes(q)),
        lessons: lessons.filter((l) => l.title.toLowerCase().includes(q)),
        projects: projects.filter((p) => p.title.toLowerCase().includes(q)),
        notes: notes.filter((n) => n.content.toLowerCase().includes(q) || n.lessonTitle.toLowerCase().includes(q)),
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lessons, projects, courses, and notes…"
          className="h-12 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
        />
      </div>

      {!results && (
        <p className="mt-6 text-center text-sm text-[var(--color-text-tertiary)]">
          Start typing to search across everything you've imported.
        </p>
      )}

      {results && (
        <div className="mt-6 space-y-6">
          <ResultGroup icon={BookOpen} label="Courses" items={results.courses.map((c) => ({ id: c.id, title: c.title, href: `/course/${c.slug}` }))} />
          <ResultGroup icon={FileText} label="Lessons" items={results.lessons.map((l) => ({ id: l.id, title: l.title, href: `/lesson/${l.slug}` }))} />
          <ResultGroup icon={FolderKanban} label="Projects" items={results.projects.map((p) => ({ id: p.id, title: p.title, href: `/project/${p.slug}` }))} />
          <ResultGroup icon={NotebookPen} label="Notes" items={results.notes.map((n) => ({ id: n.id, title: n.lessonTitle, href: "/notes" }))} />
          {Object.values(results).every((r) => r.length === 0) && (
            <p className="text-center text-sm text-[var(--color-text-tertiary)]">No results for "{query}".</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  icon: Icon,
  label,
  items,
}: {
  icon: React.ElementType;
  label: string;
  items: { id: string; title: string; href: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block rounded-[var(--radius-md)] px-3 py-2 text-[13.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
