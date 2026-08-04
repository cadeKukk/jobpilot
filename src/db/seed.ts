// Seeds a demo account with sample data: run `npm run db:seed` (with the
// dev server stopped — PGlite allows one process at a time).
// Login: demo@jobpilot.app / demopass123
try {
  process.loadEnvFile();
} catch {
  // no .env file; fall back to defaults
}

import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  applicationEvents,
  applications,
  resumes,
  userPreferences,
  users,
} from "./schema";

const DEMO_EMAIL = "demo@jobpilot.app";
const DEMO_PASSWORD = "demopass123";

const DEMO_RESUME = `CADE DEMO
Software Engineer | demo@jobpilot.app

SUMMARY
Full-stack engineer with 4 years of experience building web applications
with React, TypeScript, Next.js, and Node.js. Comfortable across the stack:
PostgreSQL schema design, REST/GraphQL APIs, CI/CD, and cloud deployment.

EXPERIENCE
Software Engineer — Acme Web Co (2022–present)
- Built customer-facing dashboard in Next.js and TypeScript serving 40k users
- Designed PostgreSQL schemas and Drizzle ORM data layer for new products
- Cut page load times 45% via server components and query optimization

Junior Developer — StartupXYZ (2020–2022)
- Shipped React features weekly across a component library used by 3 teams
- Wrote Node.js integrations with Stripe, SendGrid, and internal APIs

SKILLS
TypeScript, React, Next.js, Node.js, PostgreSQL, Tailwind CSS, Git, Docker`;

async function seed() {
  let owner = await db.query.users.findFirst({
    where: eq(users.email, DEMO_EMAIL),
  });

  if (!owner) {
    // Create through Better Auth so the password hash is real and loginable.
    const { auth } = await import("../lib/auth");
    await auth.api.signUpEmail({
      body: { name: "Demo User", email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    owner = await db.query.users.findFirst({
      where: eq(users.email, DEMO_EMAIL),
    });
    console.log(`Created demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }
  if (!owner) throw new Error("Could not create demo user");

  const hasResume = await db.query.resumes.findFirst({
    where: eq(resumes.userId, owner.id),
  });
  if (!hasResume) {
    await db.insert(resumes).values({
      userId: owner.id,
      title: "Master resume",
      content: DEMO_RESUME,
      isMaster: true,
    });
    await db
      .insert(userPreferences)
      .values({
        userId: owner.id,
        desiredRole: "software engineer",
        location: "Remote",
      })
      .onConflictDoNothing();
    console.log("Added demo master resume and preferences.");
  }

  const hasApps = await db.query.applications.findFirst({
    where: eq(applications.userId, owner.id),
  });
  if (hasApps) {
    console.log("Demo applications already exist, skipping.");
    return;
  }

  const samples = [
    {
      company: "Vercel",
      jobTitle: "Frontend Engineer",
      location: "Remote (US)",
      salary: "$140k – $180k",
      status: "interviewing" as const,
      jobUrl: "https://vercel.com/careers",
      appliedAt: daysAgo(12),
      notes: "Phone screen went well. Technical interview scheduled.",
      jobDescription:
        "We're looking for a Frontend Engineer to build delightful, fast web experiences with React, Next.js, and TypeScript. You'll work on our dashboard, collaborate with design, and care deeply about performance and accessibility.",
    },
    {
      company: "Stripe",
      jobTitle: "Full Stack Engineer",
      location: "New York, NY",
      salary: "$160k – $210k",
      status: "applied" as const,
      jobUrl: "https://stripe.com/jobs",
      appliedAt: daysAgo(5),
      jobDescription:
        "Build the economic infrastructure of the internet. We use Ruby, TypeScript, React, and distributed systems at scale. Strong API design skills and attention to reliability required.",
    },
    {
      company: "Supabase",
      jobTitle: "Product Engineer",
      location: "Remote",
      status: "saved" as const,
      jobUrl: "https://supabase.com/careers",
      notes: "Tailor resume toward Postgres experience before applying.",
      jobDescription:
        "Product Engineers at Supabase ship features end-to-end across our Postgres platform: dashboard UI in React/Next.js, APIs in TypeScript, and deep Postgres integrations.",
    },
    {
      company: "Linear",
      jobTitle: "Fullstack Engineer",
      location: "Remote",
      status: "offer" as const,
      appliedAt: daysAgo(45),
      notes: "Offer received! Deadline to respond: end of next week.",
    },
  ];

  for (const sample of samples) {
    const [app] = await db
      .insert(applications)
      .values({ ...sample, userId: owner.id })
      .returning();

    await db.insert(applicationEvents).values({
      applicationId: app.id,
      type: "created",
      note: `Added ${sample.jobTitle} at ${sample.company}`,
      occurredAt: sample.appliedAt ?? new Date(),
    });

    if (sample.status !== "saved") {
      await db.insert(applicationEvents).values({
        applicationId: app.id,
        type: "status_change",
        fromStatus: "saved",
        toStatus: sample.status,
        occurredAt: new Date(),
      });
    }
  }

  console.log(`Seeded ${samples.length} applications for ${owner.email}.`);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function closeDb() {
  const client = (db as unknown as { $client?: { close?: () => Promise<void> } })
    .$client;
  await client?.close?.().catch(() => {});
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
