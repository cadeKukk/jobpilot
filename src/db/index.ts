import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

// With DATABASE_URL set (production: Supabase/Neon) we use real Postgres.
// Without it (local dev) we fall back to PGlite, an embedded Postgres that
// persists to ./.pglite — no install or account required.
function createDb() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return drizzlePg(pool, { schema });
  }
  const client = new PGlite("./.pglite");
  return drizzlePglite(client, { schema });
}

// Singleton across Next.js hot reloads; PGlite allows only one connection
// to its data directory at a time.
const globalForDb = globalThis as unknown as { db?: Database };

export const db = globalForDb.db ?? (globalForDb.db = createDb());
