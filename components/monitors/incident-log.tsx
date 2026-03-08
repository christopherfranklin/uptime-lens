"use client";

import { useEffect, useState, useTransition } from "react";
import type { incidents } from "@/lib/db/schema";
import { formatDuration } from "@/lib/utils";
import { loadMoreIncidents } from "@/app/actions/dashboard";

type IncidentRow = typeof incidents.$inferSelect;

interface IncidentLogProps {
  incidents: { items: IncidentRow[]; hasMore: boolean };
  currentRange: string;
  monitorId: number;
}

const incidentDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatIncidentDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return incidentDateFormatter.format(d);
}

function LiveDuration({ startedAt }: { startedAt: Date | string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start =
    typeof startedAt === "string"
      ? new Date(startedAt).getTime()
      : startedAt.getTime();
  const elapsed = now - start;

  return <span>{formatDuration(elapsed > 0 ? elapsed : 0)}</span>;
}

export function IncidentLog({
  incidents: incidentData,
  currentRange,
  monitorId,
}: IncidentLogProps) {
  const [allItems, setAllItems] = useState<IncidentRow[]>(incidentData.items);
  const [hasMore, setHasMore] = useState(incidentData.hasMore);
  const [isPending, startTransition] = useTransition();

  // Reset when incidents prop changes (e.g. time range change)
  useEffect(() => {
    setAllItems(incidentData.items);
    setHasMore(incidentData.hasMore);
  }, [incidentData]);

  function handleLoadMore() {
    startTransition(async () => {
      const result = await loadMoreIncidents(
        monitorId,
        currentRange,
        allItems.length,
      );
      setAllItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
        Incident History
      </h2>

      {allItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No incidents in the last {currentRange}
        </p>
      ) : (
        <div className="space-y-3">
          {allItems.map((incident) => {
            const isOngoing = incident.status === "ongoing";

            return (
              <div
                key={incident.id}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  isOngoing
                    ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
                    : "border-border bg-background"
                }`}
              >
                {/* Status indicator */}
                <div className="mt-1.5 shrink-0">
                  {isOngoing ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                  ) : (
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isOngoing && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                        Ongoing
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {isOngoing ? (
                        <>
                          Started{" "}
                          {formatIncidentDate(incident.startedAt)}
                        </>
                      ) : (
                        <>
                          {formatIncidentDate(incident.startedAt)}
                          {incident.resolvedAt && (
                            <>
                              {" - "}
                              {formatIncidentDate(incident.resolvedAt)}
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {isOngoing ? (
                        <LiveDuration startedAt={incident.startedAt} />
                      ) : incident.resolvedAt ? (
                        formatDuration(
                          new Date(incident.resolvedAt).getTime() -
                            new Date(incident.startedAt).getTime(),
                        )
                      ) : (
                        "Unknown duration"
                      )}
                    </span>
                    {incident.cause && (
                      <span className="text-sm text-muted-foreground">
                        &middot; {incident.cause}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show more button */}
          {hasMore && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleLoadMore}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Loading..." : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
