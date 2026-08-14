"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { jobs, userPreferences } from "@/db/schema";
import { analyzeFits } from "@/lib/jobs";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

type FitResult = { ok: true; analyzed: number } | { ok: false; error: string };

// Runs Fable 5 fit analysis for the given jobs (skips already-analyzed ones).
export async function runFitAnalysis(jobIds: string[]): Promise<FitResult> {
  const user = await getCurrentUser();
  const resume = await getMasterResume(user.id);
  if (!resume) {
    return { ok: false, error: "Add your base resume first (Profile page)." };
  }
  if (jobIds.length === 0) return { ok: true, analyzed: 0 };

  const jobList = await db.query.jobs.findMany({
    where: inArray(jobs.id, jobIds.slice(0, 25)),
  });
  const pending = jobList.filter((j) => j.fitAnalyzedAt == null);

  try {
    await analyzeFits(resume, pending);
  } catch (err) {
    console.error("Fit analysis failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Fit analysis failed — try again.",
    };
  }

  revalidatePath("/jobs");
  return { ok: true, analyzed: pending.length };
}

// Saves the search phrases (one per line) that drive job discovery.
export async function saveSearchQueries(formData: FormData) {
  const user = await getCurrentUser();
  const raw = formData.get("queries");
  const location = formData.get("location");
  const queries =
    typeof raw === "string"
      ? raw
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

  await db
    .insert(userPreferences)
    .values({
      userId: user.id,
      desiredRole: queries[0] ?? null,
      location: typeof location === "string" ? location.trim() || null : null,
      searchQueries: queries,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        desiredRole: queries[0] ?? null,
        location:
          typeof location === "string" ? location.trim() || null : null,
        searchQueries: queries,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/jobs");
  revalidatePath("/profile");
}
