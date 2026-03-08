import tls from "node:tls";
import type { ProbeResult } from "./types";

export function probeSsl(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = tls.connect({
      host,
      port,
      servername: host,
      timeout: timeoutMs,
      rejectUnauthorized: false,
    });

    socket.on("secureConnect", () => {
      const responseTimeMs = performance.now() - start;
      const cert = socket.getPeerCertificate();
      socket.destroy();

      if (!cert || !cert.valid_to) {
        resolve({
          status: 0,
          responseTimeMs,
          error: "No certificate returned",
        });
        return;
      }

      resolve({
        status: 1,
        responseTimeMs,
        sslExpiresAt: new Date(cert.valid_to),
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        status: 0,
        responseTimeMs: performance.now() - start,
        error: `TLS handshake timed out after ${timeoutMs}ms`,
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
