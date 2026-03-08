interface UptimeCardsProps {
  data: { range: string; percentage: number }[];
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
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {item.percentage.toFixed(2)}%
          </p>
        </div>
      ))}
    </div>
  );
}
