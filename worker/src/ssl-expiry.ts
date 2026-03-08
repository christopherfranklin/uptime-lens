import { eq } from "drizzle-orm";
import { monitors } from "../../lib/db/schema";
import type { WorkerDb } from "./db";
import { getUserEmailForMonitor } from "./incidents";
import { sendAlertEmail } from "./emails/send";
import { sslExpiryEmailHtml } from "./emails/templates";

const APP_URL = process.env.APP_URL || "https://uptimelens.io";

// Thresholds in descending order for iteration
const SSL_THRESHOLDS = [30, 14, 7, 1];

export async function checkSslExpiry(
  db: WorkerDb,
  monitor: typeof monitors.$inferSelect,
  sslExpiresAt: Date,
): Promise<void> {
  const now = new Date();
  const daysUntilExpiry = Math.floor(
    (sslExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Handle expired cert as special threshold 0 (always fires if not already tracked as 0)
  if (daysUntilExpiry < 0) {
    if (monitor.lastSslAlertDays === 0) return; // Already alerted for expired
    // Fall through to send alert with crossedThreshold = 0
    try {
      const email = await getUserEmailForMonitor(db, monitor.id);
      if (email) {
        const html = sslExpiryEmailHtml({
          monitorName: monitor.name,
          url: monitor.url,
          daysUntilExpiry,
          expiryDate: sslExpiresAt.toISOString(),
          dashboardUrl: `${APP_URL}/dashboard`,
        });
        await sendAlertEmail({
          to: email,
          subject: `SSL Expired: ${monitor.name}`,
          html,
        });
      }
    } catch (err) {
      console.error("[worker] Failed to send SSL expiry alert:", err);
    }
    await db
      .update(monitors)
      .set({ lastSslAlertDays: 0 })
      .where(eq(monitors.id, monitor.id));
    return;
  }

  // Find the tightest (smallest) threshold that daysUntilExpiry has crossed.
  // Iterate descending; the last match is the tightest.
  let crossedThreshold: number | undefined;
  for (const t of SSL_THRESHOLDS) {
    if (daysUntilExpiry <= t) {
      crossedThreshold = t;
    }
  }

  if (crossedThreshold === undefined) {
    // Not within any threshold -- check for renewal reset
    if (monitor.lastSslAlertDays !== null) {
      // Cert renewed (expiry moved beyond all thresholds), reset tracking
      await db
        .update(monitors)
        .set({ lastSslAlertDays: null })
        .where(eq(monitors.id, monitor.id));
    }
    return;
  }

  // Check if already alerted for this threshold or lower
  if (
    monitor.lastSslAlertDays !== null &&
    monitor.lastSslAlertDays <= crossedThreshold
  ) {
    return;
  }

  // Send SSL expiry alert
  try {
    const email = await getUserEmailForMonitor(db, monitor.id);
    if (email) {
      const html = sslExpiryEmailHtml({
        monitorName: monitor.name,
        url: monitor.url,
        daysUntilExpiry,
        expiryDate: sslExpiresAt.toISOString(),
        dashboardUrl: `${APP_URL}/dashboard`,
      });
      const subject =
        daysUntilExpiry <= 0
          ? `SSL Expired: ${monitor.name}`
          : `SSL Expiring in ${daysUntilExpiry} days: ${monitor.name}`;
      await sendAlertEmail({ to: email, subject, html });
    }
  } catch (err) {
    console.error("[worker] Failed to send SSL expiry alert:", err);
  }

  // Update tracking
  await db
    .update(monitors)
    .set({ lastSslAlertDays: crossedThreshold })
    .where(eq(monitors.id, monitor.id));
}
