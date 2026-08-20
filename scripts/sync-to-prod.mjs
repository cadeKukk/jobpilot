// Copies all local JobPilot data (PGlite dev server) up to the production
// Postgres. Existing prod rows are left alone (ON CONFLICT DO NOTHING), so
// this is safe to re-run any time you want the live site to catch up with
// local work.
//
// Usage: DATABASE_URL=<prod connection string> node scripts/sync-to-prod.mjs
import { Client } from "pg";

const LOCAL_URL = "postgres://postgres:postgres@127.0.0.1:5433/postgres";
const PROD_URL = process.env.DATABASE_URL;
if (!PROD_URL || PROD_URL.includes("127.0.0.1")) {
  console.error("Set DATABASE_URL to the production connection string.");
  process.exit(1);
}

// Foreign-key order: parents first.
const TABLES = [
  "users",
  "resumes",
  "user_preferences",
  "jobs",
  "applications",
  "application_events",
  "contacts",
  "generated_documents",
];

const local = new Client({ connectionString: LOCAL_URL });
const prod = new Client({ connectionString: PROD_URL });
await local.connect();
await prod.connect();

try {
  for (const table of TABLES) {
    const { rows } = await local.query(`SELECT * FROM "${table}"`);
    let inserted = 0;
    for (const row of rows) {
      const cols = Object.keys(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const colList = cols.map((c) => `"${c}"`).join(", ");
      // Arrays/objects come back parsed from jsonb columns; node-pg would
      // serialize JS arrays as Postgres array literals, so re-stringify.
      const values = cols.map((c) => {
        const v = row[c];
        return v !== null && typeof v === "object" && !(v instanceof Date)
          ? JSON.stringify(v)
          : v;
      });
      const res = await prod.query(
        `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      inserted += res.rowCount ?? 0;
    }
    console.log(`${table}: ${inserted} inserted (${rows.length} local rows)`);
  }
} finally {
  await local.end();
  await prod.end();
}
