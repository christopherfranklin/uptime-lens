import type { ProbeResult } from "./types";

export async function probeHttp(
  _url: string,
  _timeoutMs: number,
  _expectedStatusCode: number,
): Promise<ProbeResult> {
  // TODO: implement
  return { status: 0, responseTimeMs: 0 };
}
