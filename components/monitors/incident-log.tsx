"use client";

import type { incidents } from "@/lib/db/schema";

type IncidentRow = typeof incidents.$inferSelect;

interface IncidentLogProps {
  incidents: { items: IncidentRow[]; hasMore: boolean };
  currentRange: string;
  monitorId: number;
}

export function IncidentLog({
  incidents: incidentData,
  currentRange,
}: IncidentLogProps) {
  if (incidentData.items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Incident History
        </h2>
        <p className="text-sm text-muted-foreground">
          No incidents in the last {currentRange}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
        Incident History
      </h2>
      {/* Placeholder - will be fully implemented */}
    </div>
  );
}
