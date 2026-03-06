import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = parseInt(process.env.PORT || "3001", 10);
const VERSION = "0.1.0";

/**
 * Verify database connectivity by running a simple SELECT 1 query.
 * Returns true if the connection succeeds, false otherwise.
 */
async function verifyDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[worker] DATABASE_URL not set -- skipping database connectivity check");
    return false;
  }

  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT 1 AS ok`;
    if (result[0]?.ok === 1) {
      console.log("[worker] Database connectivity verified");
      return true;
    }
    console.error("[worker] Database returned unexpected result:", result);
    return false;
  } catch (err) {
    console.error("[worker] Database connectivity check failed:", err);
    return false;
  }
}

/**
 * Create a minimal HTTP health check server.
 * GET / returns JSON with status, timestamp, and version.
 */
function createHealthServer(): ReturnType<typeof createServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          version: VERSION,
        })
      );
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  return server;
}

/**
 * Graceful shutdown handler.
 */
function setupGracefulShutdown(server: ReturnType<typeof createServer>): void {
  const shutdown = (signal: string) => {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("[worker] HTTP server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds if server hasn't closed
    setTimeout(() => {
      console.error("[worker] Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

/**
 * Main entry point for the Uptime Lens worker process.
 * Phase 4 will add BullMQ and the actual check engine here.
 */
async function main(): Promise<void> {
  console.log("[worker] Uptime Lens Worker starting...");

  // Verify database connectivity
  await verifyDatabase();

  // Start health check server
  const server = createHealthServer();
  setupGracefulShutdown(server);

  server.listen(PORT, () => {
    console.log(`[worker] Health check server listening on port ${PORT}`);
    console.log("[worker] Worker ready");
  });
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
