import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getLessonBySlug, getAdjacentLessons, courses } from "@/lib/mock-data";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedLessonBySlug } from "@/lib/server/lessons";
import { renderMarkdown, extractToc } from "@/lib/markdown";
import { DifficultyBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { TableOfContents } from "@/components/lesson/TableOfContents";
import { LessonArticle } from "@/components/lesson/LessonArticle";
import { AIChatPanel } from "@/components/lesson/AIChatPanel";
import { NotesPanel } from "@/components/lesson/NotesPanel";
import { LessonCompletionButton } from "@/components/lesson/LessonCompletionButton";
import { formatMinutes } from "@/lib/utils";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSessionState(await headers());
  const userId = session.kind === "ok" ? session.userId : "";

  // 1. Check PostgreSQL database first
  const dbLesson = userId ? await getAuthorizedLessonBySlug(userId, slug) : null;

  // 2. Fall back to mock data if not in database
  const mockLesson = !dbLesson ? getLessonBySlug(slug) : null;

  if (!dbLesson && !mockLesson) notFound();

  const lesson = dbLesson
    ? {
        id: dbLesson.id,
        title: dbLesson.title,
        slug: dbLesson.slug,
        markdown: dbLesson.markdown,
        estimatedMinutes: dbLesson.estimatedMinutes,
        difficulty: dbLesson.difficulty,
        completed: dbLesson.completed,
        courseTitle: dbLesson.course.title,
        courseSlug: dbLesson.course.slug,
        prev: dbLesson.prev,
        next: dbLesson.next,
      }
    : (() => {
        const m = mockLesson!;
        const course = courses.find((c) => c.id === m.courseId);
        const { prev, next } = getAdjacentLessons(m.id);
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          markdown: m.markdown,
          estimatedMinutes: m.estimatedMinutes,
          difficulty: m.difficulty,
          completed: m.completed,
          courseTitle: course?.title ?? "",
          courseSlug: course?.slug ?? "",
          prev: prev ? { slug: prev.slug, title: prev.title } : null,
          next: next ? { slug: next.slug, title: next.title } : null,
        };
      })();

  const html = await renderMarkdown(lesson.markdown);
  const toc = extractToc(lesson.markdown);

  return (
    <div className="forge-lesson-layout">
      <div className="min-w-0">
        {!dbLesson && <p className="forge-example-notice">Example lesson · this is sample content, not an imported source.</p>}
        {lesson.courseSlug && (
          <Link
            href={`/course/${lesson.courseSlug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-3 w-3" /> {lesson.courseTitle}
          </Link>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          <div className="flex items-center gap-2">
            <LessonCompletionButton lessonId={lesson.id} initialCompleted={lesson.completed} />

          </div>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <DifficultyBadge difficulty={lesson.difficulty} />
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
            <Clock className="h-3.5 w-3.5" /> {formatMinutes(lesson.estimatedMinutes)} read
          </span>
        </div>

        <div className="mt-8">
          <LessonArticle html={html} />
        </div>

        <div className="mt-8">
          <NotesPanel />
        </div>

        <nav aria-label="Adjacent lessons" className="forge-lesson-pagination">
          {lesson.prev ? (
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`/lesson/${lesson.prev.slug}`}>
                <ArrowLeft className="h-3.5 w-3.5" /> {lesson.prev.title}
            </Link>
          ) : (
            <span />
          )}
          {lesson.next ? (
            <Link className={buttonVariants({ size: "sm" })} href={`/lesson/${lesson.next.slug}`}>
                {lesson.next.title} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-[var(--color-text-tertiary)] font-medium">End of course material</span>
          )}
        </nav>
      </div>

      <aside className="forge-lesson-tools">
        <details className="forge-lesson-outline" open><summary>On this page</summary><TableOfContents entries={toc} /></details>
        <details className="forge-lesson-tutor" open><summary>Work through it with the tutor</summary><div className="h-[520px]"><AIChatPanel lessonId={lesson.id} lessonTitle={lesson.title} courseTitle={lesson.courseTitle} /></div></details>
      </aside>
    </div>
  );
}
