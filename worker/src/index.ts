import "dotenv/config";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { sql } from "drizzle-orm";
import { createWorkerDb } from "./db";
import { startCheckEngine } from "./check-engine";
import { startMaintenanceJob } from "./rollup";

const PORT = parseInt(process.env.PORT || "3001", 10);
const VERSION = "0.1.0";

/**
 * Verify database connectivity by running a simple SELECT 1 query.
 * Uses the Drizzle db client for consistency.
 */
async function verifyDatabase(
  db: ReturnType<typeof createWorkerDb>,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[worker] DATABASE_URL not set -- skipping database connectivity check",
    );
    return false;
  }

  try {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    console.log("[worker] Database connectivity verified");
    return true;
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
        }),
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
 * Clears check engine and maintenance intervals before closing the HTTP server.
 */
function setupGracefulShutdown(
  server: ReturnType<typeof createServer>,
  checkEngineInterval: NodeJS.Timeout,
  maintenanceInterval: NodeJS.Timeout,
): void {
  const shutdown = (signal: string) => {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);

    // Stop check engine and maintenance job
    clearInterval(checkEngineInterval);
    clearInterval(maintenanceInterval);
    console.log("[worker] Check engine stopped");

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
 * Starts health server, check engine (30s tick loop), and maintenance job (4h interval).
 */
async function main(): Promise<void> {
  console.log("[worker] Uptime Lens Worker starting...");

  // Create Drizzle DB client
  const db = createWorkerDb();

  // Verify database connectivity
  await verifyDatabase(db);

  // Start health check server
  const server = createHealthServer();

  server.listen(PORT, () => {
    console.log(`[worker] Health check server listening on port ${PORT}`);

    // Start check engine and maintenance job after health server is up
    const checkEngineInterval = startCheckEngine(db);
    const maintenanceInterval = startMaintenanceJob(db);

    // Set up graceful shutdown with interval cleanup
    setupGracefulShutdown(server, checkEngineInterval, maintenanceInterval);

    console.log("[worker] Worker ready");
  });
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
