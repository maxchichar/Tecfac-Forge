import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Clock, FolderGit2, ArrowRight } from "lucide-react";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedCourseBySlug } from "@/lib/server/courses";
import { DifficultyBadge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/course/ProgressRing";
import { buttonVariants } from "@/components/ui/Button";
import { CourseContentTabs } from "@/components/course/CourseContentTabs";
import { getAuthorizedCourseIntelligence } from "@/lib/server/intelligence/queries";
import { getAuthorizedLearningPath } from "@/lib/server/curriculum/learning-path";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSessionState(await headers());
  const userId = session.kind === "ok" ? session.userId : "";

  // 1. Check PostgreSQL database first
  const dbCourse = userId ? await getAuthorizedCourseBySlug(userId, slug) : null;

  if (!dbCourse) notFound();

  // 3. Fetch initial intelligence & learning path reports if dbCourse
  const [initialIntelligence, initialLearningPath] = (dbCourse && userId)
    ? await Promise.all([
        getAuthorizedCourseIntelligence(userId, dbCourse.id),
        getAuthorizedLearningPath(userId, dbCourse.id),
      ])
    : [null, null];

  const course = dbCourse;

  const firstIncompleteLesson = course.modules.flatMap((m) => m.lessons).find((l) => !l.completed);

  return (
    <div className="mx-auto max-w-4xl space-y-8">

      <div>
        {course.repository && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
            <FolderGit2 className="h-3.5 w-3.5" />
            {course.repository}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">{course.description}</p>
          </div>
          <ProgressRing value={course.completion} size={72} sublabel="read" />
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
          <Link className={`${buttonVariants()} mt-5 max-w-full whitespace-normal h-auto min-h-11 py-3`} href={`/lesson/${firstIncompleteLesson.slug}`}>
              Continue: {firstIncompleteLesson.title}
              <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <CourseContentTabs
        courseId={course.id}
        isDbCourse={Boolean(dbCourse)}
        modules={course.modules}
        projects={course.projects}
        initialIntelligence={initialIntelligence}
        initialLearningPath={initialLearningPath}
      />
    </div>
  );
}
