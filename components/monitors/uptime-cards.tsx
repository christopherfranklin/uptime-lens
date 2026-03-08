interface UptimeCardsProps {
  data: { range: string; percentage: number }[];
}

function getUptimeColor(percentage: number): string {
  if (percentage >= 99.5) return "text-emerald-600 dark:text-emerald-400";
  if (percentage >= 95) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function UptimeCards({ data }: UptimeCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {data.map((item) => (
        <div
          key={item.range}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {item.range}
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${getUptimeColor(item.percentage)}`}
          >
            {item.percentage.toFixed(2)}%
          </p>
        </div>
      ))}
    </div>
  );
}
