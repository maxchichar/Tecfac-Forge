import Link from "next/link";
import { ArrowUpRight, Bookmark, NotebookPen, FolderKanban, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { CourseCard } from "@/components/course/CourseCard";
import { ProgressRing } from "@/components/course/ProgressRing";
import { StreakHeatmap } from "@/components/dashboard/StreakHeatmap";
import { WeeklyBars } from "@/components/dashboard/WeeklyBars";
import { Badge } from "@/components/ui/Badge";
import {
  courses,
  bookmarks,
  notes,
  projects,
  streak,
  weeklyProgress,
  currentUser,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const inProgress = courses.filter((c) => c.completion > 0 && c.completion < 100);
  const goalPct = Math.min(100, Math.round((streak.todayMinutes / streak.dailyGoalMinutes) * 100));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-tertiary)]">Welcome back</p>
        <h1 className="text-2xl font-semibold tracking-tight">{currentUser.name.split(" ")[0]}'s dashboard</h1>
      </div>

      {/* Top stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)]">Today's goal</p>
              <p className="mt-1 text-lg font-semibold">
                {streak.todayMinutes}
                <span className="text-sm text-[var(--color-text-tertiary)]"> / {streak.dailyGoalMinutes} min</span>
              </p>
            </div>
            <ProgressRing value={goalPct} size={56} strokeWidth={5} label={`${goalPct}%`} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs text-[var(--color-text-tertiary)]">Study streak</p>
          <p className="mt-1 text-lg font-semibold">
            {streak.current} days
            <span className="ml-2 text-xs font-normal text-[var(--color-text-tertiary)]">
              longest {streak.longest}
            </span>
          </p>
          <div className="mt-3">
            <StreakHeatmap values={streak.heatmap} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs text-[var(--color-text-tertiary)]">This week</p>
          <p className="mt-1 text-lg font-semibold">
            {weeklyProgress.reduce((a, b) => a + b.minutes, 0)}
            <span className="text-sm text-[var(--color-text-tertiary)]"> min studied</span>
          </p>
          <div className="mt-2">
            <WeeklyBars data={weeklyProgress} />
          </div>
        </Card>
      </div>

      {/* Continue learning */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Continue learning</h2>
          <Link href="/workspace" className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inProgress.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming projects */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <h2 className="text-sm font-medium">Upcoming projects</h2>
            </div>
            <div className="space-y-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/project/${p.slug}`}
                  className="block rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-surface-hover)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium">{p.title}</p>
                    <Badge variant={p.status === "in_progress" ? "accent" : "default"} className="capitalize">
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{p.estimatedHours}h estimated</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent notes */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <h2 className="text-sm font-medium">Recent notes</h2>
            </div>
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                  <p className="text-[13px] font-medium">{n.lessonTitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{n.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bookmarks */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <h2 className="text-sm font-medium">Bookmarks</h2>
            </div>
            <div className="space-y-3">
              {bookmarks.map((b) => (
                <Link
                  key={b.id}
                  href={b.href}
                  className="block rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-surface-hover)]"
                >
                  <p className="text-[13px] font-medium">{b.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{b.courseTitle}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-[var(--color-accent-solid)]" />
          <div>
            <p className="text-[13px] font-medium">Weekly goal on track</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              You've studied {weeklyProgress.reduce((a, b) => a + b.minutes, 0)} minutes this week across{" "}
              {courses.length} courses.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
