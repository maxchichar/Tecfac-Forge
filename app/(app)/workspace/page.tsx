import { FolderGit2, Upload, FolderInput } from "lucide-react";
import { courses } from "@/lib/mock-data";
import { CourseCard } from "@/components/course/CourseCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function WorkspacePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            Everything you've imported, in one place.
          </p>
        </div>
        <Button variant="primary" size="md">
          <FolderInput className="h-4 w-4" />
          Import course
        </Button>
      </div>

      <Card className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <ImportOption icon={FolderGit2} title="GitHub repository" description="Paste a repo URL — README, docs, and code get parsed automatically." />
        <ImportOption icon={Upload} title="ZIP upload" description="Drop a folder of Markdown files and we'll build the course structure." />
        <ImportOption icon={FolderInput} title="Docs site" description="GitBook, Docusaurus, or Mintlify — point us at the URL." />
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

function ImportOption({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <button className="flex flex-col items-start gap-2 p-5 text-left transition-colors hover:bg-[var(--color-surface-hover)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)]">
        <Icon className="h-4.5 w-4.5 text-[var(--color-accent-solid)]" />
      </div>
      <p className="text-[13.5px] font-medium">{title}</p>
      <p className="text-xs text-[var(--color-text-tertiary)]">{description}</p>
    </button>
  );
}
