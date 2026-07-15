import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, Clock } from "lucide-react";
import { getLessonBySlug, getAdjacentLessons, courses, notes as allNotes } from "@/lib/mock-data";
import { renderMarkdown, extractToc } from "@/lib/markdown";
import { DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableOfContents } from "@/components/lesson/TableOfContents";
import { LessonArticle } from "@/components/lesson/LessonArticle";
import { AIChatPanel } from "@/components/lesson/AIChatPanel";
import { NotesPanel } from "@/components/lesson/NotesPanel";
import { formatMinutes } from "@/lib/utils";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) notFound();

  const course = courses.find((c) => c.id === lesson.courseId);
  const { prev, next } = getAdjacentLessons(lesson.id);
  const html = await renderMarkdown(lesson.markdown);
  const toc = extractToc(lesson.markdown);
  const existingNote = allNotes.find((n) => n.lessonId === lesson.id)?.content ?? "";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        {course && (
          <Link
            href={`/course/${course.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-3 w-3" /> {course.title}
          </Link>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          <button
            aria-label="Bookmark lesson"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          >
            <Bookmark className="h-4 w-4" />
          </button>
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
          <NotesPanel initialValue={existingNote} />
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-[var(--color-border)] pt-6">
          {prev ? (
            <Link href={`/lesson/${prev.slug}`}>
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-3.5 w-3.5" /> {prev.title}
              </Button>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/lesson/${next.slug}`}>
              <Button size="sm">
                {next.title} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="secondary">
              Mark course complete
            </Button>
          )}
        </div>
      </div>

      <div className="hidden lg:block">
        <TableOfContents entries={toc} />
      </div>

      {/* AI tutor — fixed panel on large screens */}
      <div className="fixed bottom-4 right-4 z-20 hidden h-[520px] w-[340px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl xl:flex">
        <AIChatPanel lessonId={lesson.id} lessonTitle={lesson.title} courseTitle={course?.title ?? ""} />
      </div>
    </div>
  );
}
