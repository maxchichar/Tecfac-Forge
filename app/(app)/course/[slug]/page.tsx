import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, FolderGit2, ArrowRight } from "lucide-react";
import { getCourseBySlug, getModulesForCourse, getProjectsForCourse } from "@/lib/mock-data";
import { DifficultyBadge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/course/ProgressRing";
import { ModuleAccordion } from "@/components/course/ModuleAccordion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const modules = getModulesForCourse(course.id);
  const courseProjects = getProjectsForCourse(course.id);
  const firstIncompleteLesson = modules.flatMap((m) => m.lessons).find((l) => !l.completed);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
          <FolderGit2 className="h-3.5 w-3.5" />
          {course.repository}
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">{course.description}</p>
          </div>
          <ProgressRing value={course.completion} size={72} sublabel="complete" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={course.difficulty} />
          {course.tags.map((t) => (
            <span key={t} className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-text-tertiary)]">
              {t}
            </span>
          ))}
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
            <Clock className="h-3.5 w-3.5" /> {course.estimatedHours}h estimated
          </span>
        </div>

        {firstIncompleteLesson && (
          <Link href={`/lesson/${firstIncompleteLesson.slug}`}>
            <Button className="mt-5" size="md">
              Continue: {firstIncompleteLesson.title}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium">Modules</h2>
        <ModuleAccordion modules={modules} />
      </section>

      {courseProjects.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium">Projects</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {courseProjects.map((p) => (
              <Link key={p.id} href={`/project/${p.slug}`}>
                <Card className="p-4 hover:bg-[var(--color-surface-hover)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-medium">{p.title}</p>
                    <DifficultyBadge difficulty={p.difficulty} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-[var(--color-text-tertiary)]">{p.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
