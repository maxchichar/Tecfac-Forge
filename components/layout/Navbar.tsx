import Link from "next/link";
import { Flame, Bell } from "lucide-react";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { currentUser, streak } from "@/lib/mock-data";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex-1">
        <CommandPalette />
      </div>

      <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)]">
        <Flame className="h-3.5 w-3.5 text-[var(--color-warning)]" />
        <span className="font-medium text-[var(--color-text-primary)]">{streak.current}</span>
        day streak
      </div>

      <button
        aria-label="Notifications"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
      >
        <Bell className="h-4 w-4" />
      </button>

      <Link href="/profile" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)] text-[12px] font-semibold text-white">
          {currentUser.avatarInitials}
        </div>
      </Link>
    </header>
  );
}
