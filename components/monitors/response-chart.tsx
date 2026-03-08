"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ResponseChartProps {
  data: { time: number; responseTime: number | null }[];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const dateWithDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function formatXAxisTick(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp));
}

function formatXAxisTickDate(timestamp: number): string {
  return dateWithDayFormatter.format(new Date(timestamp));
}

const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number | null; payload: { time: number } }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  const time = new Date(point.payload.time);
  const responseTime = point.value;

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">
        {tooltipDateFormatter.format(time)}
      </p>
      <p className="text-sm font-medium text-foreground">
        {responseTime !== null && responseTime !== undefined
          ? `${Math.round(responseTime)}ms`
          : "N/A"}
      </p>
    </div>
  );
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

  // Determine if this is a dense dataset (24h = raw heartbeats) or sparse (dates)
  const timeSpanMs =
    data.length > 1 ? data[data.length - 1].time - data[0].time : 0;
  const isHourScale = timeSpanMs < 2 * 24 * 60 * 60 * 1000; // < 2 days

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-brand-500)"
                stopOpacity={0.05}
              />
              <stop
                offset="100%"
                stopColor="var(--color-brand-500)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.5}
          />
          <XAxis
            dataKey="time"
            tickFormatter={isHourScale ? formatXAxisTick : formatXAxisTickDate}
            fontSize={12}
            axisLine={false}
            tickLine={false}
            stroke="var(--color-muted-foreground)"
          />
          <YAxis
            tickFormatter={(val: number) => `${val}ms`}
            fontSize={12}
            width={60}
            axisLine={false}
            tickLine={false}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="var(--color-brand-500)"
            strokeWidth={2}
            fill="url(#responseGradient)"
            dot={false}
            connectNulls={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
