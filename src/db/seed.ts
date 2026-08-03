import { db } from "./index";
import { applicationEvents, applications } from "./schema";

async function seed() {
  // Accounts are created through the app (Better Auth hashes passwords),
  // so seeding attaches sample data to the first registered user.
  const owner = await db.query.users.findFirst();
  if (!owner) {
    console.log("No users found. Sign up in the app first, then re-run.");
    return;
  }

  const existing = await db.query.applications.findFirst();
  if (existing) {
    console.log("Applications already exist, skipping seed.");
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
    },
    {
      company: "Stripe",
      jobTitle: "Full Stack Engineer",
      location: "New York, NY",
      salary: "$160k – $210k",
      status: "applied" as const,
      jobUrl: "https://stripe.com/jobs",
      appliedAt: daysAgo(5),
    },
    {
      company: "Supabase",
      jobTitle: "Product Engineer",
      location: "Remote",
      status: "saved" as const,
      jobUrl: "https://supabase.com/careers",
      notes: "Tailor resume toward Postgres experience before applying.",
    },
    {
      company: "Datadog",
      jobTitle: "Software Engineer II",
      location: "Boston, MA",
      salary: "$150k – $190k",
      status: "rejected" as const,
      appliedAt: daysAgo(30),
      notes: "Rejected after take-home. Ask for feedback.",
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

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
