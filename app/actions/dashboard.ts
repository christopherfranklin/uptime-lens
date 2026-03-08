"use server";

import { verifySession } from "@/lib/dal";
import { getMonitorById } from "@/lib/queries/monitors";
import { getIncidentsForMonitor } from "@/lib/queries/incidents";

export async function loadMoreIncidents(
  monitorId: number,
  range: string,
  offset: number,
) {
  const session = await verifySession();

  // Verify ownership
  const monitor = await getMonitorById(monitorId, session.user.id);
  if (!monitor) {
    throw new Error("Monitor not found");
  }

  return getIncidentsForMonitor(monitorId, range, 10, offset);
}
