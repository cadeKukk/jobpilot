"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  generatedDocuments,
} from "@/db/schema";
import { cursorEnabled, currentModelLabel, generateJSON } from "@/lib/cursor-ai";
import { extractPostingKeywords } from "@/lib/jobs";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

const SYSTEM_PROMPT = `You are an expert resume writer and career coach.
You tailor an existing resume and write a cover letter for a specific job posting.

Hard rules:
- NEVER invent experience, skills, employers, titles, dates, or credentials that are not in the candidate's resume. You may only reword, reorder, emphasize, and quantify what is already there.
- KEYWORD MAXIMIZATION: a POSTING KEYWORDS list is provided. Work EVERY keyword the candidate can honestly claim into the resume, using the posting's exact terminology (e.g. write "PostgreSQL" if the posting says PostgreSQL and the candidate has it). Sweep the entire resume — skills, bullets, summary — for honest matches, including transferable ones. Only skip a keyword when nothing in the resume genuinely supports it.
- ONE PAGE HARD LIMIT: the resume must fit a single page — at most 48 lines total (blank lines count), no line longer than 95 characters. Cut the least job-relevant content to make it fit; never squeeze by removing section structure.
- ATS FORMAT (resume): plain text only. Standard ALL-CAPS section headings (SUMMARY, TECHNICAL SKILLS, EXPERIENCE, PROJECTS, EDUCATION). Bullets start with "- ". Contact info on one line under the name. Dates like "Jul 2025 - May 2026". No tables, columns, emojis, or decorative symbols. Lead bullets with impact.
- Cover letter: 3 short paragraphs, professional but warm, no clichés like "I am writing to express". Address the specific company and role. Plain text, fits one page.`;

type TailorResult =
  | {
      ok: true;
      docs: Array<{ id: string; kind: string; content: string; model: string | null }>;
    }
  | { ok: false; error: string };

export async function generateTailoredDocuments(
  applicationId: string
): Promise<TailorResult> {
  const user = await getCurrentUser();

  if (!cursorEnabled()) {
    return {
      ok: false,
      error: "CURSOR_API_KEY is not set — add it to .env (see README).",
    };
  }

  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) return { ok: false, error: "Application not found." };

  const resume = await getMasterResume(user.id);
  if (!resume) {
    return { ok: false, error: "Add a master resume in onboarding first." };
  }

  const keywords = extractPostingKeywords(
    app.jobDescription ?? app.jobTitle,
    app.jobTitle
  );

  const jobInfo = [
    `Role: ${app.jobTitle}`,
    `Company: ${app.company}`,
    app.location ? `Location: ${app.location}` : null,
    keywords.length > 0
      ? `POSTING KEYWORDS (maximize honest coverage of these in the resume):\n${keywords.join(", ")}`
      : null,
    app.jobDescription
      ? `Job description:\n${app.jobDescription.slice(0, 12_000)}`
      : "No job description available — tailor to the role title and company.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let parsed: { tailored_resume: string; cover_letter: string };
  try {
    parsed = await generateJSON(
      SYSTEM_PROMPT,
      `Candidate's master resume:\n\n${resume.content.slice(0, 16_000)}\n\n---\n\nTarget job:\n\n${jobInfo}\n\nProduce the tailored resume and cover letter.`,
      `{"tailored_resume": "<complete tailored resume as plain text>", "cover_letter": "<complete cover letter as plain text>"}`
    );
  } catch (err) {
    console.error("Tailoring error:", err);
    return {
      ok: false,
      error:
        "Generation failed or timed out. Check CURSOR_API_KEY in .env, then try again.",
    };
  }

  const model = await currentModelLabel();

  const docs = await db
    .insert(generatedDocuments)
    .values([
      {
        applicationId: app.id,
        kind: "resume",
        content: parsed.tailored_resume,
        model,
      },
      {
        applicationId: app.id,
        kind: "cover_letter",
        content: parsed.cover_letter,
        model,
      },
    ])
    .returning();

  await db.insert(applicationEvents).values({
    applicationId: app.id,
    type: "note",
    note: `Generated tailored resume & cover letter (${model})`,
  });

  revalidatePath(`/applications/${app.id}`);
  return {
    ok: true,
    docs: docs.map((d) => ({
      id: d.id,
      kind: d.kind,
      content: d.content,
      model: d.model,
    })),
  };
}
