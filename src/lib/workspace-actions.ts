"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  generatedDocuments,
  jobs,
} from "@/db/schema";
import { currentModelLabel, cursorEnabled, generateText } from "@/lib/cursor-ai";
import { getMasterResume } from "@/lib/resume";
import { formatJobSalary } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

// APPLY on a job page: ensure a tracker entry exists, then the client
// navigates to the tailoring workspace for it.
export async function startApplication(
  jobId: string
): Promise<{ applicationId: string }> {
  const user = await getCurrentUser();

  const existing = await db.query.applications.findFirst({
    where: and(eq(applications.userId, user.id), eq(applications.jobId, jobId)),
    columns: { id: true },
  });
  if (existing) return { applicationId: existing.id };

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) throw new Error("Job not found");

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
    note: `Started application from job page (${job.source})`,
  });

  revalidatePath("/");
  revalidatePath("/jobs");
  return { applicationId: app.id };
}

type ReviseResult =
  | { ok: true; content: string; docId: string; model: string }
  | { ok: false; error: string };

const REVISE_RULES: Record<string, string> = {
  resume: `You are revising a tailored resume for a specific job application.
Hard rules:
- NEVER invent experience, skills, employers, titles, dates, or credentials that are not in the candidate's BASE RESUME. You may add, remove, reorder, reword, emphasize, and quantify — but only from what's really there.
- Where the instruction asks for a keyword the candidate genuinely has experience with, mirror the posting's terminology.
- Keep clean plain-text structure: SECTION HEADINGS in caps, bullets starting with "- ".`,
  cover_letter: `You are revising a cover letter for a specific job application.
Hard rules:
- NEVER invent experience or credentials not in the candidate's BASE RESUME.
- Keep it to 3 short paragraphs, professional but warm, no clichés. Plain text.`,
};

// Freeform revision: apply the user's instruction to the current draft.
export async function reviseDocument(
  applicationId: string,
  kind: "resume" | "cover_letter",
  currentDraft: string,
  instruction: string
): Promise<ReviseResult> {
  const user = await getCurrentUser();
  if (!cursorEnabled()) {
    return { ok: false, error: "CURSOR_API_KEY is not set — see README." };
  }
  if (!instruction.trim()) {
    return { ok: false, error: "Tell Fable what to change first." };
  }

  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) return { ok: false, error: "Application not found." };

  const baseResume = await getMasterResume(user.id);
  if (!baseResume) {
    return { ok: false, error: "Add your base resume first (Profile page)." };
  }

  let revised: string;
  try {
    revised = await generateText(
      REVISE_RULES[kind],
      [
        `CANDIDATE'S BASE RESUME (source of truth — nothing beyond this may be claimed):\n${baseResume.content.slice(0, 12_000)}`,
        `TARGET JOB:\nRole: ${app.jobTitle}\nCompany: ${app.company}${app.jobDescription ? `\nDescription:\n${app.jobDescription.slice(0, 8_000)}` : ""}`,
        `CURRENT DRAFT:\n${currentDraft.slice(0, 12_000)}`,
        `INSTRUCTION FROM THE CANDIDATE:\n${instruction.slice(0, 1_000)}`,
        `Apply the instruction to the current draft. Output ONLY the complete revised document text — no commentary, no markdown fences.`,
      ].join("\n\n---\n\n")
    );
  } catch (err) {
    console.error("Revision failed:", err);
    return { ok: false, error: "Revision failed — try again in a moment." };
  }

  const model = await currentModelLabel();
  const [doc] = await db
    .insert(generatedDocuments)
    .values({ applicationId, kind, content: revised, model })
    .returning();

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true, content: revised, docId: doc.id, model };
}

// Persist a manually edited draft as a new version.
export async function saveDocumentVersion(
  applicationId: string,
  kind: "resume" | "cover_letter",
  content: string
): Promise<{ ok: true; docId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!content.trim()) return { ok: false, error: "Nothing to save." };

  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, user.id)
    ),
    columns: { id: true },
  });
  if (!app) return { ok: false, error: "Application not found." };

  const [doc] = await db
    .insert(generatedDocuments)
    .values({ applicationId, kind, content: content.trim(), model: "manual" })
    .returning();

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true, docId: doc.id };
}
