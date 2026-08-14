import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { CompanyAvatar } from "@/components/company-avatar";
import { MatchRing } from "@/components/match-ring";
import { SaveJobButton } from "@/components/save-job-button";
import { missingKeywords, scoreSingleJob, sharedKeywords } from "@/lib/jobs";
import { getMasterResume } from "@/lib/resume";
import { formatDate, formatJobSalary } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Job details · JobPilot" };

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

  const skills = masterResume
    ? sharedKeywords(masterResume.content, job)
    : [];
  const gaps = masterResume ? missingKeywords(masterResume.content, job) : [];
  const match = masterResume
    ? await scoreSingleJob(masterResume, job)
    : null;
  const salary = formatJobSalary(job);

  const linkedinSearch = (keywords: string) =>
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <CompanyAvatar name={job.company} size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {job.title}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {job.company}
                </span>
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {job.location}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Apply now
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <SaveJobButton jobId={job.id} saved={!!savedApplication} />
            <Link
              href={`/pilot?job=${job.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-300"
            >
              <Sparkles className="h-4 w-4" />
              Ask Pilot
            </Link>
          </div>
        </div>
      </div>

      {savedApplication && (
        <Link
          href={`/applications/${savedApplication.id}`}
          className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 transition hover:border-emerald-300"
        >
          This job is in your tracker — open the application to tailor your
          resume and cover letter →
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {match && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start gap-5">
                <MatchRing pct={match.pct} size={84} />
                <div className="min-w-0 flex-1 space-y-4">
                  {skills.length > 0 && (
                    <div>
                      <h2 className="mb-2 text-sm font-semibold">
                        Why you match — skills you share
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {gaps.length > 0 && (
                    <div>
                      <h2 className="mb-2 text-sm font-semibold">
                        In the posting, not on your resume
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {gaps.map((term) => (
                          <span
                            key={term}
                            className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Worth weaving into your tailored resume if you have the
                        experience — or asking Pilot how to close the gap.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">About this job</h2>
            {job.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {job.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                No description available — check the original posting.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">At a glance</h2>
            <dl className="space-y-3 text-sm">
              <GlanceRow
                icon={<Banknote className="h-4 w-4" />}
                label="Salary"
                value={salary ?? "Not listed"}
              />
              <GlanceRow
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={job.location ?? "Not listed"}
              />
              <GlanceRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Posted"
                value={formatDate(job.postedAt)}
              />
              <GlanceRow
                icon={<Globe className="h-4 w-4" />}
                label="Source"
                value={job.source}
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <Users className="h-4 w-4 text-emerald-600" />
              Insider connections
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              A referral can 4x your chances of an interview. Find people at{" "}
              {job.company} to reach out to:
            </p>
            <div className="space-y-2">
              <InsiderLink
                href={linkedinSearch(`${job.company} recruiter`)}
                label={`Recruiters at ${job.company}`}
              />
              <InsiderLink
                href={linkedinSearch(`${job.company} hiring manager`)}
                label="Hiring managers"
              />
              <InsiderLink
                href={linkedinSearch(`${job.company} ${job.title}`)}
                label="People in this role"
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Tip: ask Pilot to draft a short outreach message before you
              connect.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function InsiderLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </a>
  );
}

function GlanceRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="inline-flex items-center gap-1.5 text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </dt>
      <dd className="text-right font-medium capitalize text-slate-700">
        {value}
      </dd>
    </div>
  );
}
