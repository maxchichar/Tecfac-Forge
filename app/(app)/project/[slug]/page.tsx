import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Lightbulb, CheckCircle2, Circle } from "lucide-react";
import { getProjectBySlug, courses } from "@/lib/mock-data";
import { DifficultyBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  reviewed: "Reviewed",
};

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const course = courses.find((c) => c.id === project.courseId);
  const doneCount = project.checklist.filter((c) => c.done).length;

  return (
    <div className="mx-auto max-w-3xl">
      {course && (
        <Link
          href={`/course/${course.slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-3 w-3" /> {course.title}
        </Link>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
        <Badge variant={project.status === "in_progress" ? "accent" : "default"}>
          {STATUS_LABEL[project.status]}
        </Badge>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <DifficultyBadge difficulty={project.difficulty} />
        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
          <Clock className="h-3.5 w-3.5" /> {project.estimatedHours}h estimated
        </span>
      </div>

      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{project.description}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-medium">Objectives</h2>
          <ul className="space-y-2 text-[13px] text-[var(--color-text-secondary)]">
            {project.objectives.map((o) => (
              <li key={o} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent-solid)]" />
                {o}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-medium">Requirements</h2>
          <ul className="space-y-2 text-[13px] text-[var(--color-text-secondary)]">
            {project.requirements.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent-solid)]" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Checklist</h2>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {doneCount}/{project.checklist.length}
          </span>
        </div>
        <div className="space-y-2">
          {project.checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 text-[13px]">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <Circle className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              )}
              <span className={item.done ? "text-[var(--color-text-tertiary)] line-through" : "text-[var(--color-text-primary)]"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--color-warning)]" />
          <h2 className="text-sm font-medium">Hints</h2>
        </div>
        <ul className="space-y-2 text-[13px] text-[var(--color-text-secondary)]">
          {project.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary">Ask AI for feedback</Button>
        <Button>Submit project</Button>
      </div>
    </div>
  );
}
