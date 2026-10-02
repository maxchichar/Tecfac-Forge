import { cn } from "@/lib/utils";

const INTENSITY_CLASS = [
  "bg-[var(--color-surface-hover)]",
  "bg-[var(--color-text-secondary)]/25",
  "bg-[var(--color-text-secondary)]/50",
  "bg-[var(--color-text-secondary)]/75",
  "bg-[var(--color-text-secondary)]",
];

export function StreakHeatmap({ values }: { values: number[] }) {
  const weeks: number[][] = [];
  for (let i = 0; i < values.length; i += 7) {
    weeks.push(values.slice(i, i + 7));
  }

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((v, di) => (
            <div
              key={di}
              className={cn("h-3 w-3 rounded-[3px]", INTENSITY_CLASS[v] ?? INTENSITY_CLASS[0])}
              title={`${v} activity level`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
