import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Briefcase, ExternalLink, MapPin, Plus } from "lucide-react";
import { db } from "@/db";
import {
  APPLICATION_STATUSES,
  applications,
  type ApplicationStatus,
} from "@/db/schema";
import { CompanyAvatar } from "@/components/company-avatar";
import { StatusSelect } from "@/components/status-select";
import { getMasterResume } from "@/lib/resume";
import { formatDate, STATUS_META } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();

  const [allApps, masterResume] = await Promise.all([
    db.query.applications.findMany({
      where: eq(applications.userId, user.id),
      orderBy: [desc(applications.updatedAt)],
    }),
    getMasterResume(user.id),
  ]);

  const filter = APPLICATION_STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : null;
  const visible = filter
    ? allApps.filter((a) => a.status === filter)
    : allApps;

  const count = (s: ApplicationStatus) =>
    allApps.filter((a) => a.status === s).length;

  const stats = [
    { label: "Total applications", value: allApps.length },
    { label: "Active", value: count("applied") + count("interviewing") },
    { label: "Interviewing", value: count("interviewing") },
    { label: "Offers", value: count("offer") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Application tracker
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track every application in one place.
        </p>
      </div>

      {!masterResume && (
        <Link
          href="/onboarding"
          className="block rounded-xl border border-blue-200 bg-blue-50 p-4 transition hover:border-blue-300"
        >
          <p className="text-sm font-medium text-blue-900">
            Finish setting up your profile
          </p>
          <p className="mt-0.5 text-sm text-blue-700">
            Add your resume to unlock tailored documents and job matching.
          </p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterTab href="/" label="All" count={allApps.length} active={!filter} />
        {APPLICATION_STATUSES.map((s) => (
          <FilterTab
            key={s}
            href={`/?status=${s}`}
            label={STATUS_META[s].label}
            count={count(s)}
            active={filter === s}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Briefcase className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            {filter
              ? `No ${STATUS_META[filter].label.toLowerCase()} applications.`
              : "No applications yet. Add your first one to get started."}
          </p>
          {!filter && (
            <div className="mt-1 flex gap-2">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Find jobs for me
              </Link>
              <Link
                href="/applications/new"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Add manually
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((app) => (
            <li
              key={app.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <Link
                href={`/applications/${app.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <CompanyAvatar name={app.company} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">
                      {app.jobTitle}
                    </p>
                    {app.jobUrl && (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                    <span className="font-medium text-slate-600">
                      {app.company}
                    </span>
                    {app.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {app.location}
                      </span>
                    )}
                    {app.appliedAt && (
                      <span className="hidden sm:inline">
                        Applied {formatDate(app.appliedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <StatusSelect applicationId={app.id} status={app.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
      }`}
    >
      {label}
      <span
        className={active ? "ml-1.5 text-emerald-100" : "ml-1.5 text-slate-400"}
      >
        {count}
      </span>
    </Link>
  );
}
