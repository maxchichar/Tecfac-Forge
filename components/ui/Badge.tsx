import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
        accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-solid)]",
        success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
        warning: "bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const DIFFICULTY_VARIANT = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Badge variant={DIFFICULTY_VARIANT[difficulty]} className="capitalize">
      {difficulty}
    </Badge>
  );
}
