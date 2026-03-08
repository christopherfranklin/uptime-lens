"use client";

import { useState } from "react";
import Link from "next/link";
import type { getMonitorsWithStats } from "@/lib/queries/monitors";
import { formatResponseTime } from "@/lib/utils";
import { MonitorPanel } from "./monitor-panel";

type EnrichedMonitor = Awaited<ReturnType<typeof getMonitorsWithStats>>[number];

interface MonitorListProps {
  monitors: EnrichedMonitor[];
}

const typeBadgeStyles: Record<string, string> = {
  http: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  tcp: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ssl: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function getStatusDotColor(monitor: EnrichedMonitor): string {
  if (monitor.status === "paused") return "bg-gray-300";
  return monitor.isUp ? "bg-emerald-500" : "bg-red-500";
}

function getUptimeColor(uptime: number): string {
  if (uptime >= 99.5) return "text-emerald-600 dark:text-emerald-400";
  if (uptime >= 95) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function MonitorList({ monitors: monitorList }: MonitorListProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  function openCreate() {
    setPanelOpen(true);
  }

  if (monitorList.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <title>No monitors</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Create your first monitor
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start monitoring your sites and services to get instant alerts
              when something goes down.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-6 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Create Monitor
            </button>
          </div>
        </div>

        <MonitorPanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          monitor={null}
        />
      </>
    );
  }

  const activeMonitors = monitorList.filter((m) => m.status === "active");
  const upCount = activeMonitors.filter((m) => m.isUp).length;
  const downCount = activeMonitors.filter((m) => !m.isUp).length;

  const summaryText =
    downCount === 0
      ? `${monitorList.length} monitor${monitorList.length !== 1 ? "s" : ""}: all operational`
      : `${monitorList.length} monitor${monitorList.length !== 1 ? "s" : ""}: ${upCount} up, ${downCount} down`;

  return (
    <>
      {/* Summary bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Monitors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{summaryText}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          + New
        </button>
      </div>

      {/* Monitor list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {monitorList.map((monitor) => {
          const responseTimeDisplay =
            monitor.status === "active" && !monitor.isUp
              ? "--"
              : formatResponseTime(monitor.latestResponseTimeMs);

          return (
            <Link
              key={monitor.id}
              href={`/monitors/${monitor.id}`}
              className={`flex w-full items-center gap-4 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50 ${
                monitor.status === "paused" ? "opacity-60" : ""
              }`}
            >
              {/* Status dot */}
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotColor(monitor)}`}
              />

              {/* Name and URL */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {monitor.name}
                </p>
                <p className="max-w-[300px] truncate text-xs text-muted-foreground">
                  {monitor.url}
                </p>
              </div>

              {/* Badges */}
              <div className="flex shrink-0 items-center gap-2">
                {monitor.status === "paused" && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Paused
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    typeBadgeStyles[monitor.type] ?? ""
                  }`}
                >
                  {monitor.type.toUpperCase()}
                </span>
              </div>

              {/* Response time */}
              <div className="w-16 shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {responseTimeDisplay}
                </p>
              </div>

              {/* 24h uptime */}
              <div className="w-16 shrink-0 text-right">
                <p className={`text-xs font-medium ${getUptimeColor(monitor.uptime24h)}`}>
                  {monitor.uptime24h}%
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <MonitorPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        monitor={null}
      />
    </>
  );
}
