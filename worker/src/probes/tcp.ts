import net from "node:net";
import type { ProbeResult } from "./types";

export function probeTcp(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = net.createConnection({ host, port, timeout: timeoutMs });

    socket.on("connect", () => {
      const responseTimeMs = performance.now() - start;
      socket.destroy();
      resolve({ status: 1, responseTimeMs });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        status: 0,
        responseTimeMs: performance.now() - start,
        error: `TCP connection timed out after ${timeoutMs}ms`,
      });
    });

    socket.on("error", (err) => {
      socket.destroy();
      resolve({
        status: 0,
        responseTimeMs: performance.now() - start,
        error: err.message,
      });
    });
  });
}
