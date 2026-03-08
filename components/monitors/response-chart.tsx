"use client";

interface ResponseChartProps {
  data: { time: number; responseTime: number | null }[];
}

export function ResponseChart({ data }: ResponseChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">
          No data for this time range
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Chart placeholder - will be implemented with Recharts */}
      <div className="h-[300px]" />
    </div>
  );
}
