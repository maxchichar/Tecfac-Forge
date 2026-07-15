export function WeeklyBars({ data }: { data: { day: string; minutes: number }[] }) {
  const max = Math.max(...data.map((d) => d.minutes), 1);
  return (
    <div className="flex h-32 items-end gap-3">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-[var(--color-surface-hover)]">
            <div
              className="w-full rounded-md bg-gradient-to-t from-[var(--color-accent-start)] to-[var(--color-accent-mid)]"
              style={{ height: `${(d.minutes / max) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-[var(--color-text-tertiary)]">{d.day}</span>
        </div>
      ))}
    </div>
  );
}
