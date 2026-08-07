import Link from "next/link";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  Banknote,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { db } from "@/db";
import { applications, userPreferences, type Job } from "@/db/schema";
import { CompanyAvatar } from "@/components/company-avatar";
import { MatchRing } from "@/components/match-ring";
import { SaveJobButton } from "@/components/save-job-button";
import {
  guessRoleFromResume,
  searchAndIngestJobs,
  scoreJobsAgainstResume,
} from "@/lib/jobs";
import { getMasterResume } from "@/lib/resume";
import { formatDate } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Find jobs · JobPilot" };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; loc?: string }>;
}) {
  const { q, loc } = await searchParams;
  const user = await getCurrentUser();

  const [prefs, masterResume] = await Promise.all([
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, user.id),
    }),
    getMasterResume(user.id),
  ]);

  let query = (q ?? prefs?.desiredRole ?? "").trim();
  const location = (loc ?? prefs?.location ?? "").trim();

  // No saved search yet? Derive one from the resume so matches populate
  // automatically after onboarding, and remember it as the preference.
  let guessedFromResume = false;
  if (!query && masterResume) {
    const guess = guessRoleFromResume(masterResume.content);
    if (guess) {
      query = guess;
      guessedFromResume = true;
      await db
        .insert(userPreferences)
        .values({ userId: user.id, desiredRole: guess, location: null })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { desiredRole: guess, updatedAt: new Date() },
        });
    }
  }

  // Remember the latest search so matches auto-populate next visit.
  if (q?.trim()) {
    await db
      .insert(userPreferences)
      .values({
        userId: user.id,
        desiredRole: q.trim(),
        location: loc?.trim() || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          desiredRole: q.trim(),
          location: loc?.trim() || null,
          updatedAt: new Date(),
        },
      });
  }

  let results: Job[] = [];
  let providerErrors: string[] = [];
  let percentages = new Map<string, number>();
  let method: "embeddings" | "keywords" | null = null;
  let savedJobIds = new Set<string>();

  if (query) {
    const ingest = await searchAndIngestJobs(query, location);
    results = ingest.jobs;
    providerErrors = ingest.providerErrors;

    if (masterResume && results.length > 0) {
      const scored = await scoreJobsAgainstResume(masterResume, results);
      percentages = scored.percentages;
      method = scored.method;
      results.sort(
        (a, b) => (percentages.get(b.id) ?? 0) - (percentages.get(a.id) ?? 0)
      );
    } else {
      results.sort(
        (a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0)
      );
    }

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

  const adzunaConfigured =
    !!process.env.ADZUNA_APP_ID && !!process.env.ADZUNA_APP_KEY;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Jobs picked for you
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live postings ranked against your resume. Save the good ones straight
          into your tracker.
        </p>
      </div>

      <form
        action="/jobs"
        className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Role or keywords — e.g. frontend engineer"
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="relative sm:max-w-52">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="loc"
            defaultValue={location}
            placeholder="Location (optional)"
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          Search
        </button>
      </form>

      {guessedFromResume && (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Showing matches for <strong>“{query}”</strong> based on your resume —
          use the search box to refine, and we&apos;ll remember it.
        </p>
      )}

      {!masterResume && query && (
        <Link
          href="/onboarding"
          className="block rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 transition hover:border-blue-300"
        >
          Add your resume to see match scores for these jobs.
        </Link>
      )}

      {method && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="h-3.5 w-3.5" />
          {method === "embeddings"
            ? "Ranked by AI semantic match between your resume and each posting."
            : "Ranked by keyword overlap with your resume. Add an AI key (free Gemini works — see README) for semantic matching."}
          {!adzunaConfigured &&
            " Showing remote roles (Remotive) — add free Adzuna API keys for on-site jobs too."}
        </p>
      )}

      {providerErrors.length > 0 && (
        <p className="text-xs text-amber-600">
          Some job sources failed: {providerErrors.join("; ")}
        </p>
      )}

      {!query ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          Search for a role above to start finding matches.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No jobs found for “{query}”. Try broader keywords.
        </div>
      ) : (
        <ul className="space-y-3">
          {results.map((job) => {
            const pct = percentages.get(job.id);
            const salary =
              job.salaryText ??
              (job.salaryMin
                ? `$${Math.round(job.salaryMin / 1000)}k – $${Math.round((job.salaryMax ?? job.salaryMin) / 1000)}k`
                : null);
            const remote = /\bremote\b/i.test(job.location ?? "");
            return (
              <li
                key={job.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex gap-4">
                  <CompanyAvatar name={job.company} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="block truncate text-base font-semibold text-slate-900 hover:text-emerald-700"
                        >
                          {job.title}
                        </Link>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          <span className="font-medium text-slate-700">
                            {job.company}
                          </span>
                          {job.postedAt && (
                            <span className="text-slate-400">
                              {" "}
                              · {formatDate(job.postedAt)}
                            </span>
                          )}
                        </p>
                      </div>
                      {pct !== undefined && (
                        <div className="hidden sm:block">
                          <MatchRing pct={pct} />
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {pct !== undefined && (
                        <Chip className="bg-emerald-50 font-semibold text-emerald-700 sm:hidden">
                          {pct}% match
                        </Chip>
                      )}
                      {job.location && (
                        <Chip>
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </Chip>
                      )}
                      {remote && (
                        <Chip className="bg-sky-50 text-sky-700">Remote</Chip>
                      )}
                      {salary && (
                        <Chip>
                          <Banknote className="h-3 w-3" />
                          {salary}
                        </Chip>
                      )}
                      <Chip className="capitalize">
                        <Globe className="h-3 w-3" />
                        {job.source}
                      </Chip>
                      {job.postedAt && (
                        <Chip className="sm:hidden">
                          <Clock className="h-3 w-3" />
                          {formatDate(job.postedAt)}
                        </Chip>
                      )}
                    </div>

                    {job.description && (
                      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {job.description}
                      </p>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500"
                        >
                          Apply now
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <SaveJobButton
                        jobId={job.id}
                        saved={savedJobIds.has(job.id)}
                      />
                      <Link
                        href={`/jobs/${job.id}`}
                        className="ml-auto text-sm font-medium text-slate-400 transition hover:text-emerald-700"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Chip({
  children,
  className = "bg-slate-100 text-slate-600",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
