import type { ProbeResult } from "./types";

export function probeSsl(
  _host: string,
  _port: number,
  _timeoutMs: number,
): Promise<ProbeResult> {
  // TODO: implement
  return Promise.resolve({ status: 0, responseTimeMs: 0 });
}
