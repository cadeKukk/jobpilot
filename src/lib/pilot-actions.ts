"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, userPreferences } from "@/db/schema";
import { chatText, getAIConfig, type ChatMessage } from "@/lib/ai";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

export type PilotMessage = { role: "user" | "assistant"; content: string };

const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 4_000;

// Pilot: JobPilot's career copilot (the Orion equivalent). Answers are
// grounded in the user's resume, preferences, and — when opened from a job —
// that specific posting.
export async function askPilot(
  history: PilotMessage[],
  jobId?: string
): Promise<{ reply?: string; error?: string }> {
  const user = await getCurrentUser();

  const config = getAIConfig();
  if (!config) {
    return {
      error:
        "Pilot needs an AI key. Set AI_API_KEY in .env — Google Gemini's free tier works (see README).",
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
    `You are Pilot, the AI career copilot inside JobPilot. You help ${user.name || "the candidate"} with job searching, interview preparation, resume advice, and career strategy.`,
    "Be concise, specific, and actionable. Use short paragraphs and dash bullets. Plain text only, no markdown headers or bold.",
    "Ground every answer in the candidate's actual resume below. Never invent experience, employers, or credentials they don't have. If asked about a gap, be honest and suggest how to address it.",
    prefs?.desiredRole && `Candidate's target role: ${prefs.desiredRole}.`,
    prefs?.location && `Preferred location: ${prefs.location}.`,
    resume
      ? `CANDIDATE RESUME:\n${resume.content.slice(0, 6_000)}`
      : "The candidate hasn't added a resume yet — encourage them to add one on the Profile page for personalized advice.",
    job &&
      `The candidate is asking about this job posting:\nTITLE: ${job.title}\nCOMPANY: ${job.company}\nLOCATION: ${job.location ?? "n/a"}\nDESCRIPTION:\n${(job.description ?? "").slice(0, 4_000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...history.slice(-MAX_HISTORY).map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, MAX_MESSAGE_CHARS),
    })),
  ];

  try {
    const reply = await chatText(config, messages);
    return { reply };
  } catch (err) {
    console.error("Pilot chat failed:", err);
    return { error: "Pilot couldn't respond — try again in a moment." };
  }
}
