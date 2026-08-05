import { defineConfig } from "drizzle-kit";

// Local dev connects to the PGlite socket server (npm run db:server, or
// started automatically by npm run dev). Production uses DATABASE_URL.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@127.0.0.1:5433/postgres",
  },
});
