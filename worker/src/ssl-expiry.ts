import { eq } from "drizzle-orm";
import { monitors } from "../../lib/db/schema";
import type { WorkerDb } from "./db";
import { getUserEmailForMonitor } from "./incidents";
import { sendAlertEmail } from "./emails/send";
import { sslExpiryEmailHtml } from "./emails/templates";

const APP_URL = process.env.APP_URL || "https://uptimelens.io";

const SSL_THRESHOLDS = [30, 14, 7, 1];

export async function checkSslExpiry(
  db: WorkerDb,
  monitor: typeof monitors.$inferSelect,
  sslExpiresAt: Date,
): Promise<void> {
  // Stub - will be implemented in Task 2
}
