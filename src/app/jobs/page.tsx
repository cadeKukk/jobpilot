import Link from "next/link";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { ExternalLink, MapPin, Search, Sparkles } from "lucide-react";
import { db } from "@/db";
import { applications, userPreferences, type Job } from "@/db/schema";
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
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Find jobs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live postings ranked against your resume. Save the good ones straight
          into your tracker.
        </p>
      </div>

      <form
        action="/jobs"
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <input
          name="q"
          defaultValue={query}
          placeholder="Role or keywords — e.g. frontend engineer"
          className={inputClass}
        />
        <input
          name="loc"
          defaultValue={location}
          placeholder="Location (optional)"
          className={`${inputClass} sm:max-w-48`}
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          <Search className="h-4 w-4" />
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
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          Search for a role above to start finding matches.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No jobs found for “{query}”. Try broader keywords.
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((job) => {
            const pct = percentages.get(job.id);
            return (
              <li
                key={job.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {pct !== undefined && <MatchBadge pct={pct} />}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-medium hover:underline"
                      >
                        {job.title}
                      </Link>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open original posting"
                          className="text-slate-400 transition hover:text-slate-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                      <span className="font-medium text-slate-600">
                        {job.company}
                      </span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}
                      {(job.salaryText || job.salaryMin) && (
                        <span>
                          {job.salaryText ??
                            `$${Math.round((job.salaryMin ?? 0) / 1000)}k – $${Math.round((job.salaryMax ?? 0) / 1000)}k`}
                        </span>
                      )}
                      {job.postedAt && (
                        <span className="hidden sm:inline">
                          Posted {formatDate(job.postedAt)}
                        </span>
                      )}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs capitalize text-slate-500">
                        {job.source}
                      </span>
                    </div>
                    {job.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {job.description}
                      </p>
                    )}
                  </div>
                  <SaveJobButton
                    jobId={job.id}
                    saved={savedJobIds.has(job.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MatchBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 75
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : pct >= 55
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      {pct}% match
    </span>
  );
}
