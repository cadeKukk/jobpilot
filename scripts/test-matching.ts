import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { resumes, users } from "../src/db/schema";
import { scoreJobsAgainstResume, searchAndIngestJobs } from "../src/lib/jobs";

// Standalone smoke test for the matching pipeline: live ingest + scoring,
// no web server required. Cleans up its temporary user afterwards.
async function main() {
  const [user] = await db
    .insert(users)
    .values({
      id: "score-test-user",
      name: "Score Test",
      email: "score-test@local",
    })
    .onConflictDoNothing()
    .returning();

  const [resume] = await db
    .insert(resumes)
    .values({
      userId: user.id,
      title: "Master resume",
      isMaster: true,
      content:
        "Frontend engineer with 4 years of experience building web applications with React, TypeScript, Next.js, and Tailwind CSS. Built REST and GraphQL APIs with Node.js and PostgreSQL. Strong focus on accessibility, performance optimization, and responsive design.",
    })
    .returning();

  console.log("Ingesting live jobs…");
  const { jobs: jobList, providerErrors } = await searchAndIngestJobs(
    "frontend engineer",
    ""
  );
  console.log(`Ingested ${jobList.length} jobs. Errors: ${providerErrors.join("; ") || "none"}`);

  const { percentages, method } = await scoreJobsAgainstResume(resume, jobList);
  console.log("Scoring method:", method);

  const ranked = jobList
    .map((j) => ({ title: j.title, pct: percentages.get(j.id) ?? 0 }))
    .sort((a, b) => b.pct - a.pct);
  console.log("Top 5 matches:");
  for (const r of ranked.slice(0, 5)) console.log(`  ${r.pct}%  ${r.title}`);
  console.log("Bottom 3:");
  for (const r of ranked.slice(-3)) console.log(`  ${r.pct}%  ${r.title}`);

  await db.delete(users).where(eq(users.id, user.id));
  console.log("Cleaned up test user.");
}

main().then(async () => {
  const client = (
    db as unknown as { $client?: { end?: () => Promise<void> } }
  ).$client;
  await client?.end?.().catch(() => {});
  process.exit(0);
});
