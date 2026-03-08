import { eq, gte, and, sql, inArray } from "drizzle-orm";
import {
  users,
  monitors,
  heartbeatsDaily,
  incidents,
} from "../../lib/db/schema";
import type { WorkerDb } from "./db";
import { sendAlertEmail } from "./emails/send";
import { weeklyDigestEmailHtml, formatDuration } from "./emails/templates";

/**
 * Check whether it's time to send weekly digests, and if so, send them.
 * Called from the maintenance job on each tick.
 *
 * Conditions:
 * - Must be Monday
 * - Must be past 9am UTC
 * - Must not have already sent this week (tracked via users.lastDigestSentAt)
 */
export async function maybeProcessWeeklyDigest(
  db: WorkerDb,
): Promise<void> {
  const now = new Date();

  // Check: is it Monday? (0=Sun, 1=Mon, ..., 6=Sat)
  if (now.getUTCDay() !== 1) return;

  // Check: is it past 9am UTC?
  if (now.getUTCHours() < 9) return;

  console.log("[worker] Processing weekly digests...");

  // Get all users who have at least one monitor
  const usersWithMonitors = await db
    .selectDistinct({
      id: users.id,
      email: users.email,
      lastDigestSentAt: users.lastDigestSentAt,
    })
    .from(users)
    .innerJoin(monitors, eq(monitors.userId, users.id));

  if (usersWithMonitors.length === 0) {
    console.log("[worker] No users with monitors -- skipping digest");
    return;
  }

  // Calculate this Monday 00:00 UTC
  const mondayStart = new Date(now);
  mondayStart.setUTCHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const user of usersWithMonitors) {
    try {
      // Check if already sent this week
      if (user.lastDigestSentAt && user.lastDigestSentAt >= mondayStart) {
        continue;
      }

      // Get user's monitors
      const userMonitors = await db
        .select({ id: monitors.id, name: monitors.name })
        .from(monitors)
        .where(eq(monitors.userId, user.id));

      if (userMonitors.length === 0) continue; // safety check

      const monitorIds = userMonitors.map((m) => m.id);

      // Get 7-day uptime per monitor from daily rollups
      const uptimeData = await db
        .select({
          monitorId: heartbeatsDaily.monitorId,
          totalChecks:
            sql<number>`COALESCE(SUM(${heartbeatsDaily.totalChecks}), 0)`,
          successfulChecks:
            sql<number>`COALESCE(SUM(${heartbeatsDaily.successfulChecks}), 0)`,
        })
        .from(heartbeatsDaily)
        .where(
          and(
            inArray(heartbeatsDaily.monitorId, monitorIds),
            gte(heartbeatsDaily.date, sevenDaysAgo),
          ),
        )
        .groupBy(heartbeatsDaily.monitorId);

      // Build monitor uptime list
      const monitorUptimes = userMonitors.map((m) => {
        const data = uptimeData.find((d) => d.monitorId === m.id);
        const uptimePercentage =
          data && data.totalChecks > 0
            ? (data.successfulChecks / data.totalChecks) * 100
            : 100; // No data = assume 100%
        return {
          name: m.name,
          uptimePercentage: Math.round(uptimePercentage * 100) / 100,
        };
      });

      // Get past week's incidents
      const weekIncidents = await db
        .select({
          monitorId: incidents.monitorId,
          startedAt: incidents.startedAt,
          resolvedAt: incidents.resolvedAt,
          cause: incidents.cause,
        })
        .from(incidents)
        .where(
          and(
            inArray(incidents.monitorId, monitorIds),
            gte(incidents.startedAt, sevenDaysAgo),
          ),
        );

      const incidentList = weekIncidents.map((inc) => {
        const monitorName =
          userMonitors.find((m) => m.id === inc.monitorId)?.name || "Unknown";
        const duration = inc.resolvedAt
          ? formatDuration(
              inc.resolvedAt.getTime() - inc.startedAt.getTime(),
            )
          : "Ongoing";
        return { monitorName, duration, cause: inc.cause || "Unknown" };
      });

      // Format week range for subject/content
      const weekEnd = new Date(now);
      const weekStart = new Date(sevenDaysAgo);

      const html = weeklyDigestEmailHtml({
        monitors: monitorUptimes,
        incidents: incidentList,
        weekStart: weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        weekEnd: weekEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });

      await sendAlertEmail({
        to: user.email,
        subject: "Uptime Lens: Weekly Digest",
        html,
      });

      // Update lastDigestSentAt
      await db
        .update(users)
        .set({ lastDigestSentAt: now })
        .where(eq(users.id, user.id));
    } catch (err) {
      console.error(
        `[worker] Failed to send digest for user ${user.id}:`,
        err,
      );
      // Continue to next user
    }
  }

  console.log("[worker] Weekly digests complete");
}
