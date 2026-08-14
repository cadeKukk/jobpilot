"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  generatedDocuments,
  jobs,
  userPreferences,
} from "@/db/schema";
import { currentModelLabel, cursorEnabled, generateText } from "@/lib/cursor-ai";
import { extractPostingKeywords } from "@/lib/jobs";
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
- KEYWORD MAXIMIZATION: a POSTING KEYWORDS list is provided. Unless the instruction says otherwise, preserve existing keyword coverage and work in any still-missing keywords the candidate can honestly claim, using the posting's exact terminology.
- ONE PAGE HARD LIMIT: at most 48 lines total (blank lines count), no line longer than 95 characters. Cut the least job-relevant content to fit.
- ATS FORMAT: plain text, ALL-CAPS section headings (SUMMARY, TECHNICAL SKILLS, EXPERIENCE, PROJECTS, EDUCATION), bullets starting with "- ", no tables, columns, emojis, or decorative symbols.`,
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

  const keywords = extractPostingKeywords(
    app.jobDescription ?? app.jobTitle,
    app.jobTitle
  );

  let revised: string;
  try {
    revised = await generateText(
      REVISE_RULES[kind],
      [
        `CANDIDATE'S BASE RESUME (source of truth — nothing beyond this may be claimed):\n${baseResume.content.slice(0, 12_000)}`,
        `TARGET JOB:\nRole: ${app.jobTitle}\nCompany: ${app.company}${app.jobDescription ? `\nDescription:\n${app.jobDescription.slice(0, 8_000)}` : ""}`,
        keywords.length > 0
          ? `POSTING KEYWORDS (maximize honest coverage):\n${keywords.join(", ")}`
          : null,
        `CURRENT DRAFT:\n${currentDraft.slice(0, 12_000)}`,
        `INSTRUCTION FROM THE CANDIDATE:\n${instruction.slice(0, 1_000)}`,
        `Apply the instruction to the current draft. Output ONLY the complete revised document text — no commentary, no markdown fences.`,
      ]
        .filter(Boolean)
        .join("\n\n---\n\n")
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

// "Apply with tailored résumé": snapshot the current drafts (so unsaved edits
// aren't lost), mark this application as the active extension handoff, and
// bump the tracker status. The Chrome extension then autofills apply pages
// with these exact documents.
export async function handoffToExtension(
  applicationId: string,
  resumeDraft: string,
  coverLetterDraft: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();

  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, user.id)
    ),
    columns: { id: true },
  });
  if (!app) return { ok: false, error: "Application not found." };

  // Persist any draft that differs from its latest stored version.
  const stored = await db.query.generatedDocuments.findMany({
    where: eq(generatedDocuments.applicationId, applicationId),
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  });
  for (const [kind, draft] of [
    ["resume", resumeDraft],
    ["cover_letter", coverLetterDraft],
  ] as const) {
    const latest = stored.find((d) => d.kind === kind);
    if (draft.trim() && draft.trim() !== latest?.content.trim()) {
      await db.insert(generatedDocuments).values({
        applicationId,
        kind,
        content: draft.trim(),
        model: "manual",
      });
    }
  }

  await db
    .insert(userPreferences)
    .values({
      userId: user.id,
      activeApplicationId: applicationId,
      activeHandoffAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        activeApplicationId: applicationId,
        activeHandoffAt: new Date(),
        updatedAt: new Date(),
      },
    });

  await db.insert(applicationEvents).values({
    applicationId,
    type: "note",
    note: "Sent tailored documents to the Chrome extension and opened the apply page",
  });

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/");
  return { ok: true };
}
