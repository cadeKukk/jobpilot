import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  APPLICATION_STATUSES,
  applications,
  type ApplicationStatus,
} from "@/db/schema";
import { MonoLabel, SectionMark, btnOutline, btnSolid } from "@/components/editorial";
import { StatusSelect } from "@/components/status-select";
import { getMasterResume } from "@/lib/resume";
import { formatDate, STATUS_META } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export default async function TrackerPage({
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
    { label: "TOTAL", value: allApps.length },
    { label: "ACTIVE", value: count("applied") + count("interviewing") },
    { label: "INTERVIEWING", value: count("interviewing") },
    { label: "OFFERS", value: count("offer") },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SectionMark text="SEC. 02 — APPLICATION TRACKER" />
        <h1 className="text-3xl font-bold tracking-tight">Tracker.</h1>
        <p className="text-sm text-neutral-500">
          Every application, from saved to signed.
        </p>
      </div>

      {!masterResume && (
        <Link
          href="/onboarding"
          className="block border border-neutral-950 bg-white p-4 text-sm transition hover:bg-neutral-950 hover:text-white"
        >
          <span className="font-mono text-[10px] tracking-[0.18em]">
            [ SETUP REQUIRED ]
          </span>{" "}
          Add your base résumé to unlock tailoring and fit analysis →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-px border border-neutral-950 bg-neutral-950 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#fafaf8] p-4">
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {stat.value}
            </p>
            <MonoLabel>{stat.label}</MonoLabel>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-neutral-950 py-3">
        <FilterLink href="/" active={!filter}>
          ALL — {allApps.length}
        </FilterLink>
        {APPLICATION_STATUSES.map((s) => (
          <FilterLink key={s} href={`/?status=${s}`} active={filter === s}>
            {STATUS_META[s].label.toUpperCase()} — {count(s)}
          </FilterLink>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="space-y-4 border border-dashed border-neutral-300 py-16 text-center">
          <p className="text-sm text-neutral-400">
            {filter
              ? `No ${STATUS_META[filter].label.toLowerCase()} applications.`
              : "Nothing tracked yet."}
          </p>
          {!filter && (
            <div className="flex justify-center gap-3">
              <Link href="/jobs" className={btnSolid}>
                FIND MATCHES →
              </Link>
              <Link href="/applications/new" className={btnOutline}>
                ADD MANUALLY +
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ol className="border-t border-neutral-950">
          {visible.map((app, i) => (
            <li
              key={app.id}
              className="flex items-center gap-4 border-b border-neutral-200 py-4 transition hover:bg-white"
            >
              <span className="hidden w-14 shrink-0 font-mono text-[10px] tracking-[0.18em] text-neutral-400 sm:block">
                [ {String(i + 1).padStart(2, "0")} ]
              </span>
              <Link href={`/applications/${app.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold tracking-tight hover:underline decoration-2 underline-offset-4">
                  {app.jobTitle}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tracking-[0.16em] text-neutral-400">
                  {[
                    app.company.toUpperCase(),
                    app.location && `LOC — ${app.location.toUpperCase()}`,
                    app.appliedAt &&
                      `APPLIED — ${formatDate(app.appliedAt).toUpperCase()}`,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              </Link>
              <StatusSelect applicationId={app.id} status={app.status} />
            </li>
          ))}
        </ol>
      )}

      <div className="flex justify-end">
        <Link
          href="/applications/new"
          className="font-mono text-[11px] tracking-[0.14em] text-neutral-400 transition hover:text-neutral-950"
        >
          ADD APPLICATION +
        </Link>
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`font-mono text-[11px] tracking-[0.18em] transition ${
        active
          ? "bg-neutral-950 px-2 py-1 text-white"
          : "text-neutral-400 hover:text-neutral-950"
      }`}
    >
      {children}
    </Link>
  );
}
