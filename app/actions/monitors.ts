"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, monitors } from "@/lib/db";
import { verifySession } from "@/lib/dal";

type ActionResult =
  | { success: true; monitorId?: number; newStatus?: string }
  | { error: string };

const VALID_TYPES = ["http", "tcp", "ssl"] as const;
type MonitorType = (typeof VALID_TYPES)[number];

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidTcpHostPort(value: string): boolean {
  const parts = value.split(":");
  if (parts.length < 2) return false;
  const portStr = parts[parts.length - 1];
  const port = Number(portStr);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  const host = parts.slice(0, -1).join(":");
  return host.length > 0;
}

export async function createMonitor(formData: FormData): Promise<ActionResult> {
  const session = await verifySession();

  const name = formData.get("name")?.toString().trim();
  const url = formData.get("url")?.toString().trim();
  const type = formData.get("type")?.toString() as MonitorType | undefined;

  if (!name || name.length === 0) {
    return { error: "Name is required" };
  }
  if (name.length > 255) {
    return { error: "Name must be 255 characters or fewer" };
  }
  if (!url || url.length === 0) {
    return { error: "URL is required" };
  }
  if (!type || !VALID_TYPES.includes(type)) {
    return { error: "Type must be http, tcp, or ssl" };
  }

  // Type-specific URL validation
  if (type === "http" || type === "ssl") {
    if (!isValidHttpUrl(url)) {
      return { error: "URL must start with http:// or https://" };
    }
  } else if (type === "tcp") {
    if (!isValidTcpHostPort(url)) {
      return { error: "TCP target must be in host:port format with port 1-65535" };
    }
  }

  const [inserted] = await db
    .insert(monitors)
    .values({
      userId: session.user.id,
      name,
      url,
      type,
    })
    .returning({ id: monitors.id });

  revalidatePath("/dashboard");

  return { success: true, monitorId: inserted.id };
}

export async function updateMonitor(
  formData: FormData,
): Promise<ActionResult> {
  const session = await verifySession();

  const idStr = formData.get("id")?.toString();
  if (!idStr) {
    return { error: "Monitor ID is required" };
  }
  const id = Number(idStr);

  // Verify ownership
  const [existing] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)))
    .limit(1);

  if (!existing) {
    return { error: "Monitor not found" };
  }

  // Build update object with only allowed fields (NOT type, NOT url)
  const updateData: Record<string, unknown> = {};

  const name = formData.get("name")?.toString().trim();
  if (name !== undefined && name !== null && name.length > 0) {
    updateData.name = name;
  }

  const expectedStatusCode = formData.get("expectedStatusCode")?.toString();
  if (expectedStatusCode) {
    updateData.expectedStatusCode = Number(expectedStatusCode);
  }

  const checkIntervalSeconds = formData.get("checkIntervalSeconds")?.toString();
  if (checkIntervalSeconds) {
    updateData.checkIntervalSeconds = Number(checkIntervalSeconds);
  }

  const timeoutMs = formData.get("timeoutMs")?.toString();
  if (timeoutMs) {
    updateData.timeoutMs = Number(timeoutMs);
  }

  const status = formData.get("status")?.toString();
  if (status === "active" || status === "paused") {
    updateData.status = status;
  }

  updateData.updatedAt = new Date();

  await db
    .update(monitors)
    .set(updateData)
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)));

  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteMonitor(
  formData: FormData,
): Promise<ActionResult> {
  const session = await verifySession();

  const idStr = formData.get("id")?.toString();
  if (!idStr) {
    return { error: "Monitor ID is required" };
  }
  const id = Number(idStr);

  // Verify ownership
  const [existing] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)))
    .limit(1);

  if (!existing) {
    return { error: "Monitor not found" };
  }

  await db
    .delete(monitors)
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)));

  revalidatePath("/dashboard");

  return { success: true };
}

export async function toggleMonitorStatus(
  formData: FormData,
): Promise<ActionResult> {
  const session = await verifySession();

  const idStr = formData.get("id")?.toString();
  if (!idStr) {
    return { error: "Monitor ID is required" };
  }
  const id = Number(idStr);

  // Verify ownership and get current status
  const [existing] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)))
    .limit(1);

  if (!existing) {
    return { error: "Monitor not found" };
  }

  const newStatus = existing.status === "active" ? "paused" : "active";

  await db
    .update(monitors)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)));

  revalidatePath("/dashboard");

  return { success: true, newStatus };
}
