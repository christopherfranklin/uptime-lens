import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

export function formatResponseTime(ms: number | null): string {
  if (ms === null || ms === undefined) return "--";
  return `${Math.round(ms)}ms`;
}

export function getRangeSince(range: string, now?: Date): Date {
  const ref = now ?? new Date();
  const hoursMap: Record<string, number> = {
    "24h": 24,
    "7d": 168,
    "30d": 720,
    "90d": 2160,
  };
  const hours = hoursMap[range] ?? 24;
  return new Date(ref.getTime() - hours * 60 * 60 * 1000);
}
