import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DifficultyBadge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/course/ProgressRing";

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  repository?: string | null;
  completion: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  estimatedHours: number;
  moduleIds: string[];
}

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link href={`/course/${course.slug}`}>
      <Card className="group h-full p-5 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {course.repository}
            </p>
            <h3 className="mt-1 truncate text-[15px] font-semibold text-[var(--color-text-primary)] group-hover:text-gradient">
              {course.title}
            </h3>
          </div>
          <ProgressRing value={course.completion} size={52} strokeWidth={5} label={`${course.completion}%`} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{course.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={course.difficulty} />
          {course.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-text-tertiary)]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-tertiary)]">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {course.estimatedHours}h
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> {course.moduleIds.length} modules
          </span>
        </div>
      </Card>
    </Link>
  );
}
