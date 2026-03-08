"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { incidents as incidentsTable, monitors } from "@/lib/db/schema";
import { MonitorPanel } from "./monitor-panel";
import { ResponseChart } from "./response-chart";
import { UptimeCards } from "./uptime-cards";
import { IncidentLog } from "./incident-log";

type MonitorRow = typeof monitors.$inferSelect;
type IncidentRow = typeof incidentsTable.$inferSelect;

const TIME_RANGES = ["24h", "7d", "30d", "90d"] as const;

interface MonitorDetailProps {
  monitor: MonitorRow;
  chartData: { time: number; responseTime: number | null }[];
  uptimeData: { range: string; percentage: number }[];
  incidents: {
    items: IncidentRow[];
    hasMore: boolean;
  };
  currentRange: string;
}

function getStatusBadge(monitor: MonitorRow) {
  if (monitor.status === "paused") {
    return {
      label: "Paused",
      className:
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
  }
  if (monitor.isUp) {
    return {
      label: "Operational",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
  }
  return {
    label: "Down",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
}

export function MonitorDetail({
  monitor,
  chartData,
  uptimeData,
  incidents,
  currentRange,
}: MonitorDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [panelOpen, setPanelOpen] = useState(false);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60_000);
    return () => clearInterval(interval);
  }, [router]);

  const status = getStatusBadge(monitor);

  function handleRangeChange(range: string) {
    router.push(`${pathname}?range=${range}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <title>Back</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Back to monitors
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {monitor.name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{monitor.url}</p>
          </div>

          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Time range selector */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {TIME_RANGES.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => handleRangeChange(range)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currentRange === range
                ? "bg-brand-500 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Response time chart */}
      <div className="mb-6">
        <ResponseChart data={chartData} />
      </div>

      {/* Uptime percentages */}
      <div className="mb-6">
        <UptimeCards data={uptimeData} />
      </div>

      {/* Incident log */}
      <div className="mb-6">
        <IncidentLog
          incidents={incidents}
          currentRange={currentRange}
          monitorId={monitor.id}
        />
      </div>

      {/* Edit panel */}
      <MonitorPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        monitor={monitor}
      />
    </div>
  );
}
