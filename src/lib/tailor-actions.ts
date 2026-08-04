"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  generatedDocuments,
} from "@/db/schema";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

const SYSTEM_PROMPT = `You are an expert resume writer and career coach.
You tailor an existing resume and write a cover letter for a specific job posting.

Hard rules:
- NEVER invent experience, skills, employers, titles, dates, or credentials that are not in the candidate's resume. You may only reword, reorder, emphasize, and quantify what is already there.
- Mirror terminology from the job description where the candidate genuinely has the experience.
- Resume: keep a clean plain-text structure (SECTION HEADINGS in caps, bullet points starting with "- "). Lead bullets with impact.
- Cover letter: 3 short paragraphs, professional but warm, no clichés like "I am writing to express". Address the specific company and role. Plain text.`;

type TailorResult =
  | { ok: true }
  | { ok: false; error: string };

export async function generateTailoredDocuments(
  applicationId: string
): Promise<TailorResult> {
  const user = await getCurrentUser();

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY is not configured." };
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

  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const jobInfo = [
    `Role: ${app.jobTitle}`,
    `Company: ${app.company}`,
    app.location ? `Location: ${app.location}` : null,
    app.jobDescription
      ? `Job description:\n${app.jobDescription.slice(0, 12_000)}`
      : "No job description available — tailor to the role title and company.",
  ]
    .filter(Boolean)
    .join("\n");

  let parsed: { tailored_resume: string; cover_letter: string };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Candidate's master resume:\n\n${resume.content.slice(0, 16_000)}\n\n---\n\nTarget job:\n\n${jobInfo}\n\nProduce the tailored resume and cover letter.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tailored_documents",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tailored_resume: {
                  type: "string",
                  description: "Complete tailored resume as plain text",
                },
                cover_letter: {
                  type: "string",
                  description: "Complete cover letter as plain text",
                },
              },
              required: ["tailored_resume", "cover_letter"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("OpenAI tailoring failed:", res.status, body);
      return {
        ok: false,
        error: `OpenAI request failed (${res.status}). Check your API key and billing.`,
      };
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    parsed = JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("Tailoring error:", err);
    return { ok: false, error: "Generation failed or timed out. Try again." };
  }

  await db.insert(generatedDocuments).values([
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
  ]);

  await db.insert(applicationEvents).values({
    applicationId: app.id,
    type: "note",
    note: `Generated tailored resume & cover letter (${model})`,
  });

  revalidatePath(`/applications/${app.id}`);
  return { ok: true };
}
