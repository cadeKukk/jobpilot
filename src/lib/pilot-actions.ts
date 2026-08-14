"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, userPreferences } from "@/db/schema";
import { cursorEnabled, generateText } from "@/lib/cursor-ai";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

export type PilotMessage = { role: "user" | "assistant"; content: string };

const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 4_000;

// Pilot: the built-in career copilot, running on Fable 5 via the Cursor SDK.
export async function askPilot(
  history: PilotMessage[],
  jobId?: string
): Promise<{ reply?: string; error?: string }> {
  const user = await getCurrentUser();

  if (!cursorEnabled()) {
    return {
      error:
        "Pilot needs your Cursor API key. Add CURSOR_API_KEY to .env (Cursor Dashboard → Integrations).",
    };
  }

  const [resume, prefs, job] = await Promise.all([
    getMasterResume(user.id),
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, user.id),
    }),
    jobId
      ? db.query.jobs.findFirst({ where: eq(jobs.id, jobId) })
      : Promise.resolve(null),
  ]);

  const system = [
    `You are Pilot, the career copilot inside ${user.name}'s personal job-search tool. You help with job searching, interview preparation, resume advice, relocation planning (including Estonia — they are a dual citizen), and career strategy.`,
    "Be concise, specific, and actionable. Use short paragraphs and dash bullets. Plain text only, no markdown headers or bold.",
    "Ground every answer in the candidate's actual resume below. Never invent experience, employers, or credentials they don't have. If asked about a gap, be honest and suggest how to address it.",
    prefs?.desiredRole && `Target role: ${prefs.desiredRole}.`,
    prefs?.location && `Preferred location: ${prefs.location}.`,
    resume
      ? `CANDIDATE RESUME:\n${resume.content.slice(0, 6_000)}`
      : "The candidate hasn't added a resume yet — encourage them to add one on the Profile page for personalized advice.",
    job &&
      `The candidate is asking about this job posting:\nTITLE: ${job.title}\nCOMPANY: ${job.company}\nLOCATION: ${job.location ?? "n/a"}\nDESCRIPTION:\n${(job.description ?? "").slice(0, 4_000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const transcript = history
    .slice(-MAX_HISTORY)
    .map(
      (m) =>
        `${m.role === "user" ? "CANDIDATE" : "PILOT"}: ${String(m.content).slice(0, MAX_MESSAGE_CHARS)}`
    )
    .join("\n\n");

  try {
    const reply = await generateText(
      system,
      `Conversation so far:\n\n${transcript}\n\nRespond as PILOT to the candidate's last message. Output only your reply text.`
    );
    return { reply };
  } catch (err) {
    console.error("Pilot chat failed:", err);
    return { error: "Pilot couldn't respond — try again in a moment." };
  }
}
