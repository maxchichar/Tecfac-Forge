"use client";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  gradientId?: string;
}

export function ProgressRing({
  value,
  size = 88,
  strokeWidth = 7,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-semibold leading-none text-[var(--color-text-primary)]">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && <span className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">{sublabel}</span>}
      </div>
    </div>
  );
}
