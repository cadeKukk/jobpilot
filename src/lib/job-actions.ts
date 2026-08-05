"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { applicationEvents, applications, jobs } from "@/db/schema";
import { formatJobSalary } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export async function saveJobToTracker(jobId: string) {
  const user = await getCurrentUser();

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) throw new Error("Job not found");

  const existing = await db.query.applications.findFirst({
    where: and(
      eq(applications.userId, user.id),
      eq(applications.jobId, jobId)
    ),
  });
  if (existing) return;

  const [app] = await db
    .insert(applications)
    .values({
      userId: user.id,
      jobId: job.id,
      company: job.company,
      jobTitle: job.title,
      jobUrl: job.url,
      location: job.location,
      salary: formatJobSalary(job),
      jobDescription: job.description,
      status: "saved",
    })
    .returning();

  await db.insert(applicationEvents).values({
    applicationId: app.id,
    type: "created",
    note: `Saved from job matches (${job.source})`,
  });

  revalidatePath("/");
  revalidatePath("/jobs");
}
