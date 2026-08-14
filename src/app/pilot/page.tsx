import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { PilotChat } from "@/components/pilot-chat";
import { getAIConfig } from "@/lib/ai";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Pilot · JobPilot" };

export default async function PilotPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job: jobId } = await searchParams;
  const user = await getCurrentUser();

  const [masterResume, job] = await Promise.all([
    getMasterResume(user.id),
    jobId
      ? db.query.jobs.findFirst({ where: eq(jobs.id, jobId) })
      : Promise.resolve(null),
  ]);

  const aiEnabled = !!getAIConfig();

  const suggestions = job
    ? [
        `Why am I a good fit for ${job.title} at ${job.company}?`,
        `How should I prepare for an interview at ${job.company}?`,
        "What skills from this posting am I missing, and how do I close the gap?",
        "Draft a short outreach message to a recruiter for this role.",
      ]
    : [
        "Review my resume — what are its three biggest weaknesses?",
        "What roles am I strongly qualified for right now?",
        "How do I answer “tell me about yourself” in an interview?",
        "Plan my job search for the next two weeks.",
      ];

  return (
    <div className="space-y-5">
      <div>
        {job && (
          <Link
            href={`/jobs/${job.id}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {job.title}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Pilot</h1>
        <p className="mt-1 text-sm text-slate-500">
          {job
            ? `Your career copilot — with the ${job.title} posting at ${job.company} in context.`
            : "Your 24/7 career copilot, grounded in your resume."}
        </p>
      </div>

      {!masterResume && (
        <Link
          href="/onboarding"
          className="block rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 transition hover:border-blue-300"
        >
          Add your resume so Pilot can give personalized advice →
        </Link>
      )}

      <PilotChat
        jobId={job?.id}
        suggestions={suggestions}
        aiEnabled={aiEnabled}
      />
    </div>
  );
}
