import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { AnalyzeButton } from "@/components/analyze-button";
import { MonoLabel, SectionMark, btnOutline, btnSolid } from "@/components/editorial";
import { SaveJobButton } from "@/components/save-job-button";
import { cursorEnabled } from "@/lib/cursor-ai";
import { missingKeywords, sharedKeywords } from "@/lib/jobs";
import { getMasterResume } from "@/lib/resume";
import { formatDate, formatJobSalary } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Job · JobPilot" };

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, id) });
  if (!job) notFound();

  const [masterResume, savedApplication] = await Promise.all([
    getMasterResume(user.id),
    db.query.applications.findFirst({
      where: and(
        eq(applications.userId, user.id),
        eq(applications.jobId, job.id)
      ),
      columns: { id: true },
    }),
  ]);

  const skills = masterResume ? sharedKeywords(masterResume.content, job) : [];
  const gaps = masterResume ? missingKeywords(masterResume.content, job) : [];
  const salary = formatJobSalary(job);

  const linkedinSearch = (keywords: string) =>
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;

  return (
    <div className="space-y-8">
      <Link
        href="/jobs"
        className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 hover-invert"
      >
        ← BACK TO MATCHES
      </Link>

      <div className="space-y-3 border-b border-neutral-50 pb-6">
        <SectionMark text="SEC. 02 — POSTING" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            <p className="mt-1 text-lg text-neutral-400">{job.company}</p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.16em] text-neutral-500">
              {[
                job.location && `LOC — ${job.location.toUpperCase()}`,
                salary && `SAL — ${salary.toUpperCase()}`,
                `SRC — ${job.source.toUpperCase()}`,
                job.postedAt &&
                  `POSTED — ${formatDate(job.postedAt).toUpperCase()}`,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          </div>
          {job.fitScore != null && (
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums tracking-tight">
                {job.fitScore}
                <span className="text-lg text-neutral-500">/100</span>
              </p>
              <MonoLabel>FABLE 5 FIT</MonoLabel>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className={btnSolid}
            >
              APPLY ↗
            </a>
          )}
          <Link href={`/pilot?job=${job.id}`} className={btnOutline}>
            ASK PILOT
          </Link>
          <SaveJobButton jobId={job.id} saved={!!savedApplication} />
        </div>
      </div>

      {savedApplication && (
        <Link
          href={`/applications/${savedApplication.id}`}
          className="block border border-neutral-50 bg-neutral-900 p-4 text-sm transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          <span className="font-mono text-[10px] tracking-[0.18em]">
            [ IN TRACKER ]
          </span>{" "}
          Open the application to tailor your résumé and cover letter →
        </Link>
      )}

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="space-y-4">
            <SectionMark text="FIT ANALYSIS" />
            {job.fitVerdict ? (
              <div className="space-y-5">
                <p className="text-lg italic leading-relaxed">
                  “{job.fitVerdict}”
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  {(job.fitStrengths?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <MonoLabel>STRENGTHS</MonoLabel>
                      <ul className="space-y-1.5 text-sm leading-relaxed text-neutral-300">
                        {job.fitStrengths!.map((s) => (
                          <li key={s}>— {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(job.fitGaps?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <MonoLabel>GAPS</MonoLabel>
                      <ul className="space-y-1.5 text-sm leading-relaxed text-neutral-400">
                        {job.fitGaps!.map((g) => (
                          <li key={g}>— {g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : masterResume && cursorEnabled() ? (
              <AnalyzeButton jobIds={[job.id]} label="ANALYZE THIS JOB" />
            ) : (
              <p className="text-sm text-neutral-500">
                {masterResume
                  ? "Set CURSOR_API_KEY in .env to run Fable 5 fit analysis."
                  : "Add your base résumé to run fit analysis."}
              </p>
            )}
          </section>

          {(skills.length > 0 || gaps.length > 0) && (
            <section className="space-y-4 border-t border-neutral-800 pt-6">
              <SectionMark text="KEYWORD OVERLAP" />
              <div className="grid gap-6 sm:grid-cols-2">
                {skills.length > 0 && (
                  <div className="space-y-2">
                    <MonoLabel>ON YOUR RÉSUMÉ</MonoLabel>
                    <p className="text-sm leading-relaxed text-neutral-300">
                      {skills.join("  ·  ")}
                    </p>
                  </div>
                )}
                {gaps.length > 0 && (
                  <div className="space-y-2">
                    <MonoLabel>IN POSTING ONLY</MonoLabel>
                    <p className="text-sm leading-relaxed text-neutral-500">
                      {gaps.join("  ·  ")}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="space-y-4 border-t border-neutral-800 pt-6">
            <SectionMark text="DESCRIPTION" />
            {job.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                {job.description}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                No description available — check the original posting.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-3 border border-neutral-50 p-5">
            <SectionMark text="AT A GLANCE" />
            <dl className="space-y-2.5">
              <GlanceRow label="SALARY" value={salary ?? "Not listed"} />
              <GlanceRow label="LOCATION" value={job.location ?? "Not listed"} />
              <GlanceRow label="POSTED" value={formatDate(job.postedAt)} />
              <GlanceRow label="SOURCE" value={job.source} />
            </dl>
          </section>

          <section className="space-y-3">
            <SectionMark text="INSIDER CONNECTIONS" />
            <p className="text-sm leading-relaxed text-neutral-400">
              A referral multiplies your odds. Find people at {job.company}:
            </p>
            <ul className="space-y-2">
              <InsiderLink
                href={linkedinSearch(`${job.company} recruiter`)}
                label={`RECRUITERS AT ${job.company.toUpperCase()}`}
              />
              <InsiderLink
                href={linkedinSearch(`${job.company} hiring manager`)}
                label="HIRING MANAGERS"
              />
              <InsiderLink
                href={linkedinSearch(`${job.company} ${job.title}`)}
                label="PEOPLE IN THIS ROLE"
              />
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function GlanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] tracking-[0.16em] text-neutral-500">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}

function InsiderLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
      >
        {label} ↗
      </a>
    </li>
  );
}
