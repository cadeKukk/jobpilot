import Link from "next/link";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, userPreferences, type Job } from "@/db/schema";
import { AnalyzeButton } from "@/components/analyze-button";
import { btnSolid, MonoLabel, SectionMark, inputBase } from "@/components/editorial";
import { SaveJobButton } from "@/components/save-job-button";
import { cursorEnabled } from "@/lib/cursor-ai";
import { keywordScore, searchAndIngestJobs } from "@/lib/jobs";
import { getMasterResume } from "@/lib/resume";
import { formatDate, formatJobSalary } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Jobs · JobPilot" };

const DEFAULT_QUERIES = ["software engineer", "AI engineer", "IT specialist"];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    remote?: string;
    ee?: string;
    fresh?: string;
  }>;
}) {
  const { q, tab, remote, ee, fresh } = await searchParams;
  const savedTab = tab === "saved";
  const remoteOnly = remote === "1";
  const estoniaOnly = ee === "1";
  const freshOnly = fresh === "1";
  const user = await getCurrentUser();

  const [prefs, masterResume] = await Promise.all([
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, user.id),
    }),
    getMasterResume(user.id),
  ]);

  // Search phrases: an explicit ?q= overrides; otherwise the saved list
  // (Profile page) or sensible defaults.
  const queries = q?.trim()
    ? [q.trim()]
    : prefs?.searchQueries?.length
      ? prefs.searchQueries
      : [
          ...(prefs?.desiredRole ? [prefs.desiredRole] : []),
          ...DEFAULT_QUERIES,
        ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4);

  let results: Job[] = [];
  let providerErrors: string[] = [];
  let savedJobIds = new Set<string>();

  if (savedTab) {
    const saved = await db.query.applications.findMany({
      where: and(
        eq(applications.userId, user.id),
        isNotNull(applications.jobId)
      ),
      columns: { jobId: true },
    });
    savedJobIds = new Set(saved.map((s) => s.jobId as string));
    if (savedJobIds.size > 0) {
      results = await db.query.jobs.findMany({
        where: inArray(jobs.id, [...savedJobIds]),
      });
    }
  } else {
    const ingest = await searchAndIngestJobs(
      queries,
      prefs?.location ?? ""
    );
    results = ingest.jobs;
    providerErrors = ingest.providerErrors;

    if (results.length > 0) {
      const saved = await db.query.applications.findMany({
        where: and(
          eq(applications.userId, user.id),
          isNotNull(applications.jobId),
          inArray(
            applications.jobId,
            results.map((j) => j.id)
          )
        ),
        columns: { jobId: true },
      });
      savedJobIds = new Set(saved.map((s) => s.jobId as string));
    }
  }

  if (remoteOnly)
    results = results.filter((j) => /remote/i.test(j.location ?? ""));
  if (estoniaOnly)
    results = results.filter((j) => /estonia/i.test(j.location ?? ""));
  if (freshOnly) {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    results = results.filter((j) => (j.postedAt?.getTime() ?? 0) >= cutoff);
  }

  // Rank: Fable-analyzed jobs by absolute fit score, then unanalyzed jobs
  // by keyword overlap (retrieval order).
  const kw = new Map<string, number>();
  if (masterResume) {
    for (const j of results) kw.set(j.id, keywordScore(masterResume.content, j));
  }
  results.sort((a, b) => {
    const aScore = a.fitScore ?? -1;
    const bScore = b.fitScore ?? -1;
    if (aScore !== bScore) return bScore - aScore;
    return (kw.get(b.id) ?? 0) - (kw.get(a.id) ?? 0);
  });

  // Next batch for Fable analysis: best unanalyzed candidates by keywords.
  const unanalyzed = results
    .filter((j) => j.fitAnalyzedAt == null)
    .sort((a, b) => (kw.get(b.id) ?? 0) - (kw.get(a.id) ?? 0))
    .slice(0, 15)
    .map((j) => j.id);
  const analyzedCount = results.filter((j) => j.fitAnalyzedAt != null).length;

  const buildUrl = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (savedTab) params.set("tab", "saved");
    if (remoteOnly) params.set("remote", "1");
    if (estoniaOnly) params.set("ee", "1");
    if (freshOnly) params.set("fresh", "1");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SectionMark text="SEC. 01 — JOB MATCHES" />
        <h1 className="text-3xl font-bold tracking-tight">Matches.</h1>
        <p className="max-w-xl text-sm text-neutral-400">
          {savedTab
            ? "Postings you've saved into the tracker."
            : `Live postings from ${estoniaOnly ? "cv.ee" : "Remotive, cv.ee (Estonia), Arbeitnow (EU)" + (process.env.ADZUNA_APP_ID ? ", Adzuna" : "")} for: ${queries.join(" · ")}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-neutral-50 py-3">
        <FilterLink href={buildUrl({ tab: null })} active={!savedTab}>
          RECOMMENDED
        </FilterLink>
        <FilterLink href={buildUrl({ tab: "saved" })} active={savedTab}>
          IN TRACKER
        </FilterLink>
        <span className="h-4 w-px bg-neutral-700" aria-hidden />
        <FilterLink
          href={buildUrl({ remote: remoteOnly ? null : "1" })}
          active={remoteOnly}
        >
          REMOTE
        </FilterLink>
        <FilterLink
          href={buildUrl({ ee: estoniaOnly ? null : "1" })}
          active={estoniaOnly}
        >
          ESTONIA
        </FilterLink>
        <FilterLink
          href={buildUrl({ fresh: freshOnly ? null : "1" })}
          active={freshOnly}
        >
          PAST WEEK
        </FilterLink>
      </div>

      {!savedTab && (
        <form action="/jobs" className="flex max-w-xl items-end gap-4">
          <label className="flex-1 space-y-1">
            <MonoLabel>ONE-OFF SEARCH</MonoLabel>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="e.g. python developer tallinn"
              className={inputBase}
            />
          </label>
          <button type="submit" className={btnSolid}>
            SEARCH →
          </button>
        </form>
      )}

      {!masterResume && (
        <Link
          href="/onboarding"
          className="block border border-neutral-50 bg-neutral-900 p-4 text-sm transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          <span className="font-mono text-[10px] tracking-[0.18em]">
            [ SETUP REQUIRED ]
          </span>{" "}
          Add your base résumé to unlock fit analysis and tailoring →
        </Link>
      )}

      {!savedTab && masterResume && (
        <div className="space-y-2">
          {cursorEnabled() ? (
            <AnalyzeButton jobIds={unanalyzed} />
          ) : (
            <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
              [ SET CURSOR_API_KEY IN .ENV TO ENABLE FABLE 5 FIT ANALYSIS ]
            </p>
          )}
          {analyzedCount > 0 && (
            <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
              {analyzedCount} OF {results.length} ANALYZED — RANKED BY ABSOLUTE
              FIT
            </p>
          )}
        </div>
      )}

      {providerErrors.length > 0 && (
        <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
          [ SOURCE ERRORS: {providerErrors.join("; ").toUpperCase()} ]
        </p>
      )}

      {results.length === 0 ? (
        <div className="border border-dashed border-neutral-700 py-16 text-center text-sm text-neutral-500">
          {savedTab
            ? "Nothing saved yet — save postings from the Recommended tab."
            : "No postings found. Adjust your search phrases on the Profile page."}
        </div>
      ) : (
        <ol className="border-t border-neutral-50">
          {results.map((job, i) => (
            <li
              key={job.id}
              className="group border-b border-neutral-800 py-5 transition hover:bg-neutral-900"
            >
              <div className="flex items-baseline gap-4">
                <span className="hidden w-14 shrink-0 font-mono text-[10px] tracking-[0.18em] text-neutral-500 sm:block">
                  [ {String(i + 1).padStart(2, "0")} ]
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-lg font-semibold leading-snug tracking-tight hover-invert"
                    >
                      {job.title}
                    </Link>
                    <span className="font-mono text-[11px] tracking-[0.14em]">
                      {job.fitScore != null ? (
                        <span
                          className={
                            job.fitScore >= 65
                              ? "bg-neutral-50 px-2 py-0.5 text-neutral-950"
                              : "text-neutral-50"
                          }
                        >
                          FIT — {job.fitScore}/100
                        </span>
                      ) : (
                        <span className="text-neutral-700">FIT — PENDING</span>
                      )}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-neutral-400">
                    {job.company}
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-neutral-500">
                    {[
                      job.location && `LOC — ${job.location.toUpperCase()}`,
                      formatJobSalary(job) &&
                        `SAL — ${formatJobSalary(job)!.toUpperCase()}`,
                      `SRC — ${job.source.toUpperCase()}`,
                      job.postedAt &&
                        `POSTED — ${formatDate(job.postedAt).toUpperCase()}`,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                  {job.fitVerdict && (
                    <p className="max-w-2xl text-sm italic leading-relaxed text-neutral-400">
                      “{job.fitVerdict}”
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-5 pt-1.5">
                    <SaveJobButton
                      jobId={job.id}
                      saved={savedJobIds.has(job.id)}
                    />
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
                      >
                        APPLY ↗
                      </a>
                    )}
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
                    >
                      DETAILS →
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
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
      className={`px-2 py-1 font-mono text-[11px] tracking-[0.18em] ${
        active
          ? "bg-neutral-50 text-neutral-950"
          : "text-neutral-500 hover-invert"
      }`}
    >
      {children}
    </Link>
  );
}
