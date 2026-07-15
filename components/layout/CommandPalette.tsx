"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, FolderKanban, LayoutDashboard, Search } from "lucide-react";
import { courses, lessons, projects } from "@/lib/mock-data";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-strong)]"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search lessons, projects, notes…</span>
        <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global command menu"
        className="fixed inset-0 z-50"
        shouldFilter
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className="surface-glass fixed left-1/2 top-[18%] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4">
            <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <Command.Input
              autoFocus
              placeholder="Jump to a course, lesson, or project…"
              className="h-12 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigate" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              <Item icon={LayoutDashboard} onSelect={() => go("/dashboard")}>Dashboard</Item>
              <Item icon={BookOpen} onSelect={() => go("/workspace")}>Workspace</Item>
            </Command.Group>

            <Command.Group heading="Courses" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {courses.map((c) => (
                <Item key={c.id} icon={BookOpen} onSelect={() => go(`/course/${c.slug}`)}>
                  {c.title}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Lessons" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {lessons.slice(0, 6).map((l) => (
                <Item key={l.id} icon={FileText} onSelect={() => go(`/lesson/${l.slug}`)}>
                  {l.title}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Projects" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {projects.map((p) => (
                <Item key={p.id} icon={FolderKanban} onSelect={() => go(`/project/${p.slug}`)}>
                  {p.title}
                </Item>
              ))}
            </Command.Group>
          </Command.List>
        </div>
      </Command.Dialog>
    </>
  );
}

function Item({
  icon: Icon,
  children,
  onSelect,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13.5px] text-[var(--color-text-secondary)] data-[selected=true]:bg-[var(--color-surface-hover)] data-[selected=true]:text-[var(--color-text-primary)]"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Command.Item>
  );
}
