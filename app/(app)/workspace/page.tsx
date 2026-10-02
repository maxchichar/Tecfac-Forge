import { headers } from "next/headers";
import { FolderGit2, Upload, FolderInput } from "lucide-react";
import { courses as mockCourses } from "@/lib/mock-data";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedCourses } from "@/lib/server/courses";
import { CourseCard } from "@/components/course/CourseCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ImportCourseDialog } from "@/components/workspace/ImportCourseDialog";

export default async function WorkspacePage() {
  const session = await getSessionState(await headers());
  const userId = session.kind === "ok" ? session.userId : "";

  const dbCourses = userId ? await getAuthorizedCourses(userId) : [];
  const courses = dbCourses.length > 0 ? dbCourses : mockCourses;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            Everything you&apos;ve imported, in one place.
          </p>
        </div>
        <ImportCourseDialog>
          <Button variant="primary" size="md">
            <FolderInput className="h-4 w-4" />
            Import course
          </Button>
        </ImportCourseDialog>
      </div>

      <Card className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <ImportCourseDialog>
          <button className="w-full flex flex-col items-start gap-2 p-5 text-left transition-colors hover:bg-[var(--color-surface-hover)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)]">
              <FolderGit2 className="h-4.5 w-4.5 text-[var(--color-accent-solid)]" />
            </div>
            <p className="text-[13.5px] font-medium">GitHub repository</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Paste a repo URL — README, docs, and structure get parsed automatically.
            </p>
          </button>
        </ImportCourseDialog>

        <div className="flex flex-col items-start gap-2 p-5 text-left opacity-60">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-hover)]">
            <Upload className="h-4.5 w-4.5 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-[13.5px] font-medium">ZIP upload (Upcoming)</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Drop a folder of Markdown files to build a course.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 p-5 text-left opacity-60">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-hover)]">
            <FolderInput className="h-4.5 w-4.5 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-[13.5px] font-medium">Docs site (Upcoming)</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            GitBook, Docusaurus, or Mintlify doc import.
          </p>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
          {courses.length} courses
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </div>
  );
}
