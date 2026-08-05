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
} from "lucide-react";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { SaveJobButton } from "@/components/save-job-button";
import { sharedKeywords } from "@/lib/jobs";
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
  const salary = formatJobSalary(job);

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
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
        <div className="flex items-center gap-2">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              View posting
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <SaveJobButton jobId={job.id} saved={!!savedApplication} />
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
          {skills.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">
                Skills you share with this posting
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5">
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
          <section className="rounded-xl border border-slate-200 bg-white p-5">
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
        </div>
      </div>
    </div>
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
