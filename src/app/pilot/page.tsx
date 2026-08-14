import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { SectionMark } from "@/components/editorial";
import { PilotChat } from "@/components/pilot-chat";
import { cursorEnabled } from "@/lib/cursor-ai";
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

  const aiEnabled = cursorEnabled();

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
        "What should I know about finding IT work in Estonia as a dual citizen?",
        "Plan my job search for the next two weeks.",
      ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SectionMark text="SEC. 03 — CAREER COPILOT" />
        <h1 className="text-3xl font-bold tracking-tight">Pilot.</h1>
        <p className="max-w-xl text-sm text-neutral-400">
          {job ? (
            <>
              Fable 5, grounded in your résumé — with{" "}
              <Link
                href={`/jobs/${job.id}`}
                className="hover-invert underline decoration-2 underline-offset-2"
              >
                {job.title} at {job.company}
              </Link>{" "}
              in context.
            </>
          ) : (
            "Fable 5, grounded in your résumé. Interview prep, fit questions, relocation strategy."
          )}
        </p>
      </div>

      {!masterResume && (
        <Link
          href="/onboarding"
          className="block border border-neutral-50 bg-neutral-900 p-4 text-sm transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          <span className="font-mono text-[10px] tracking-[0.18em]">
            [ SETUP REQUIRED ]
          </span>{" "}
          Add your base résumé so Pilot can give personalized advice →
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
