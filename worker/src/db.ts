import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "../../lib/db/schema";

export type WorkerDb = NeonHttpDatabase<typeof schema>;

export function createWorkerDb(): WorkerDb {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle({ client: sql, schema });
}
