"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface ImportCourseDialogProps {
  children?: React.ReactNode;
}

export function ImportCourseDialog({ children }: ImportCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to import course.");
      }

      setOpen(false);
      setRepoUrl("");
      router.push(`/course/${data.courseSlug}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="primary" size="md">
            <FolderGit2 className="h-4 w-4" />
            Import from GitHub
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-[var(--color-accent-solid)]" />
            Import GitHub Repository
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleImport} className="space-y-4 pt-2">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Provide a public GitHub repository URL or shorthand (e.g.{" "}
            <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">rust-lang/book</code> or{" "}
            <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">https://github.com/owner/repo</code>).
            We will discover its Markdown documentation and build structured lessons.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="repoUrl" className="text-xs font-medium text-[var(--color-text-primary)]">
              Repository URL or owner/repo
            </label>
            <input
              id="repoUrl"
              type="text"
              placeholder="e.g. rust-lang/book"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={loading}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-red-500/10 p-3 text-xs text-[var(--color-danger)]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={loading || !repoUrl.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ingesting...
                </>
              ) : (
                <>
                  Build Course
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
