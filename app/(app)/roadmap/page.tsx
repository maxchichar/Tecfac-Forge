import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ROADMAP = [
  { title: "Linux", status: "done" },
  { title: "Shell", status: "done" },
  { title: "Git", status: "done" },
  { title: "Algorithms", status: "current" },
  { title: "Networking", status: "upcoming" },
  { title: "Backend", status: "upcoming" },
  { title: "Docker", status: "upcoming" },
  { title: "Cloud", status: "upcoming" },
  { title: "Deployment", status: "upcoming" },
] as const;

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
      <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
        Your suggested path from fundamentals to deployment, built from the courses you've imported.
      </p>

      <div className="mt-8 space-y-0">
        {ROADMAP.map((step, i) => (
          <div key={step.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  step.status === "done" &&
                    "border-transparent bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)] text-white",
                  step.status === "current" &&
                    "border-[var(--color-accent-solid)] text-[var(--color-accent-solid)]",
                  step.status === "upcoming" && "border-[var(--color-border)] text-[var(--color-text-tertiary)]"
                )}
              >
                {step.status === "done" ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < ROADMAP.length - 1 && (
                <div
                  className={cn(
                    "w-px flex-1",
                    step.status === "done" ? "bg-[var(--color-accent-solid)]" : "bg-[var(--color-border)]"
                  )}
                  style={{ minHeight: 32 }}
                />
              )}
            </div>
            <div className="pb-8">
              <p
                className={cn(
                  "text-[15px] font-medium",
                  step.status === "upcoming" ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"
                )}
              >
                {step.title}
              </p>
              {step.status === "current" && (
                <p className="mt-0.5 text-xs text-[var(--color-accent-solid)]">In progress</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
