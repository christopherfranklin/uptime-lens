import { eq, and } from "drizzle-orm";
import { incidents, monitors, users } from "../../lib/db/schema";
import type { WorkerDb } from "./db";

export async function openIncident(
  db: WorkerDb,
  monitorId: number,
  cause: string,
  startedAt: Date,
): Promise<void> {
  await db.insert(incidents).values({
    monitorId,
    status: "ongoing",
    cause,
    startedAt,
  });
  await db
    .update(monitors)
    .set({ isUp: false, updatedAt: startedAt })
    .where(eq(monitors.id, monitorId));
}

export async function resolveIncident(
  db: WorkerDb,
  incidentId: number,
  monitorId: number,
  resolvedAt: Date,
): Promise<void> {
  await db
    .update(incidents)
    .set({ status: "resolved", resolvedAt })
    .where(eq(incidents.id, incidentId));
  await db
    .update(monitors)
    .set({ isUp: true, updatedAt: resolvedAt })
    .where(eq(monitors.id, monitorId));
}

export async function getOngoingIncident(
  db: WorkerDb,
  monitorId: number,
) {
  const [incident] = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.monitorId, monitorId),
        eq(incidents.status, "ongoing"),
      ),
    )
    .limit(1);
  return incident ?? null;
}

export async function getUserEmailForMonitor(
  db: WorkerDb,
  monitorId: number,
): Promise<string | null> {
  const [result] = await db
    .select({ email: users.email })
    .from(users)
    .innerJoin(monitors, eq(monitors.userId, users.id))
    .where(eq(monitors.id, monitorId))
    .limit(1);
  return result?.email ?? null;
}
