import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Local dev runs `scripts/db-server.ts` (an embedded PGlite instance behind
// the Postgres wire protocol — started automatically by `npm run dev`).
// Production sets DATABASE_URL to a hosted Postgres (Supabase, Neon, etc.).
export const LOCAL_DEV_DATABASE_URL =
  "postgres://postgres:postgres@127.0.0.1:5433/postgres";

export type Database = ReturnType<typeof createDb>;

function createDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? LOCAL_DEV_DATABASE_URL,
  });
  return drizzle(pool, { schema });
}

// Singleton across Next.js hot reloads.
const globalForDb = globalThis as unknown as { db?: Database };

export const db = globalForDb.db ?? (globalForDb.db = createDb());
