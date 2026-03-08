import type { ProbeResult } from "./types";

export async function probeHttp(
  url: string,
  timeoutMs: number,
  expectedStatusCode: number,
): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseTimeMs = performance.now() - start;
    const success = response.status === expectedStatusCode;
    return {
      status: success ? 1 : 0,
      responseTimeMs,
      statusCode: response.status,
      error: success
        ? undefined
        : `Expected ${expectedStatusCode}, got ${response.status}`,
    };
  } catch (err) {
    const responseTimeMs = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      (err instanceof DOMException && err.name === "TimeoutError") ||
      message.includes("TimeoutError") ||
      message.includes("abort");
    return {
      status: 0,
      responseTimeMs,
      error: isTimeout ? `Timeout after ${timeoutMs}ms` : message,
    };
  }
}
