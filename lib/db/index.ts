import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Please set it in your .env.local file.",
    );
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle({ client: sql, schema });
}

let _db: NeonHttpDatabase<typeof schema> | undefined;

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    if (!_db) {
      _db = createDb();
    }
    return Reflect.get(_db, prop, receiver);
  },
});

export * from "./schema";
