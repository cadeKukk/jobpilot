// Ensures the single owner user exists. Run `npm run db:seed` while the dev
// database is running (`npm run dev` or `npm run db:server`). Resume and
// search preferences are added in the app itself (/onboarding).
try {
  process.loadEnvFile();
} catch {
  // no .env file; fall back to defaults
}

import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

const OWNER_ID = "owner";

async function seed() {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, OWNER_ID),
  });
  if (existing) {
    console.log(`Owner already exists: ${existing.name} <${existing.email}>`);
    return;
  }

  await db.insert(users).values({
    id: OWNER_ID,
    name: process.env.OWNER_NAME ?? "Cade Kukk",
    email: process.env.OWNER_EMAIL ?? "cadekukk@gmail.com",
  });
  console.log("Created owner user. Add your base resume at /onboarding.");
}

async function closeDb() {
  const client = (
    db as unknown as { $client?: { end?: () => Promise<void> } }
  ).$client;
  await client?.end?.().catch(() => {});
}

seed()
  .then(async () => {
    await closeDb();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await closeDb();
    process.exit(1);
  });
