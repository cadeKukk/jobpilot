import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// Single-user mode: JobPilot is Cade's personal tool. The owner row is
// created on first access — no auth, no sessions.
export const OWNER_ID = "owner";

export async function getCurrentUser() {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, OWNER_ID),
  });
  if (existing) return existing;

  await db
    .insert(users)
    .values({
      id: OWNER_ID,
      name: process.env.OWNER_NAME ?? "Cade Kukk",
      email: process.env.OWNER_EMAIL ?? "cadekukk@gmail.com",
    })
    .onConflictDoNothing();

  return (await db.query.users.findFirst({
    where: eq(users.id, OWNER_ID),
  }))!;
}
