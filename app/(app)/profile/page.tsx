import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/course/ProgressRing";
import { courses, currentUser, streak } from "@/lib/mock-data";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)] text-xl font-semibold text-white">
          {currentUser.avatarInitials}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{currentUser.name}</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">{currentUser.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center">
          <p className="text-2xl font-semibold">{streak.current}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">day streak</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-semibold">{courses.length}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">courses in progress</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-semibold">{courses.filter((c) => c.completion === 100).length}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">completed</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium">Mastery by course</h2>
        <div className="space-y-4">
          {courses.map((c) => (
            <div key={c.id} className="flex items-center gap-4">
              <ProgressRing value={c.completion} size={44} strokeWidth={4} label={`${c.completion}%`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{c.title}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{c.language}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
