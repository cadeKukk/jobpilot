import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { jobs, type Job, type Resume } from "@/db/schema";
import { cursorEnabled, generateJSON, resolveFableModel } from "@/lib/cursor-ai";

type RawJob = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  description: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryText?: string | null;
  postedAt?: Date | null;
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_DESCRIPTION_CHARS = 6_000;

// Converts posting HTML to readable plain text, preserving paragraph and
// list structure so descriptions stay scannable in the UI.
function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr)>/gi, "\n\n")
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// --- Providers ------------------------------------------------------------

// Remotive: free, no API key, remote jobs only.
async function fetchRemotive(query: string): Promise<RawJob[]> {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(
    query
  )}&limit=30`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Remotive responded ${res.status}`);
  const data = (await res.json()) as {
    jobs: Array<{
      id: number;
      url: string;
      title: string;
      company_name: string;
      candidate_required_location: string;
      salary: string;
      description: string;
      publication_date: string;
    }>;
  };
  return data.jobs.map((j) => ({
    source: "remotive",
    externalId: String(j.id),
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location
      ? `Remote (${j.candidate_required_location})`
      : "Remote",
    url: j.url,
    description: stripHtml(j.description).slice(0, MAX_DESCRIPTION_CHARS),
    salaryText: j.salary || null,
    postedAt: j.publication_date ? new Date(j.publication_date) : null,
  }));
}

// Adzuna: broad US coverage incl. on-site roles. Requires free API keys.
async function fetchAdzuna(query: string, location: string): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const country = process.env.ADZUNA_COUNTRY ?? "us";
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    results_per_page: "30",
    "content-type": "application/json",
  });
  if (location) params.set("where", location);

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Adzuna responded ${res.status}`);
  const data = (await res.json()) as {
    results: Array<{
      id: string;
      title: string;
      company?: { display_name?: string };
      location?: { display_name?: string };
      description?: string;
      redirect_url?: string;
      salary_min?: number;
      salary_max?: number;
      created?: string;
    }>;
  };
  return data.results.map((j) => ({
    source: "adzuna",
    externalId: String(j.id),
    title: stripHtml(j.title),
    company: j.company?.display_name ?? "Unknown company",
    location: j.location?.display_name ?? null,
    url: j.redirect_url ?? null,
    description: j.description
      ? stripHtml(j.description).slice(0, MAX_DESCRIPTION_CHARS)
      : null,
    salaryMin: j.salary_min ? Math.round(j.salary_min) : null,
    salaryMax: j.salary_max ? Math.round(j.salary_max) : null,
    postedAt: j.created ? new Date(j.created) : null,
  }));
}

// cv.ee: Estonia's main job board (unofficial JSON search used by their SPA).
async function fetchCvEe(query: string): Promise<RawJob[]> {
  const url = `https://cv.ee/api/v1/vacancy-search-service/search?limit=30&offset=0&keywords[]=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`cv.ee responded ${res.status}`);
  const data = (await res.json()) as {
    vacancies: Array<{
      id: number;
      positionTitle: string;
      positionContent?: string;
      employerName?: string;
      salaryFrom?: number | null;
      salaryTo?: number | null;
      hourlySalary?: boolean;
      publishDate?: string;
      remoteWork?: boolean;
    }>;
  };
  return (data.vacancies ?? []).map((v) => ({
    source: "cvee",
    externalId: String(v.id),
    title: v.positionTitle,
    company: v.employerName ?? "Unknown company",
    location: v.remoteWork ? "Estonia (Remote OK)" : "Estonia",
    url: `https://cv.ee/et/vacancy/${v.id}`,
    description: v.positionContent
      ? stripHtml(v.positionContent).slice(0, MAX_DESCRIPTION_CHARS)
      : null,
    salaryMin: !v.hourlySalary && v.salaryFrom ? Math.round(v.salaryFrom * 12) : null,
    salaryMax: !v.hourlySalary && v.salaryTo ? Math.round(v.salaryTo * 12) : null,
    salaryText:
      v.salaryFrom && !v.hourlySalary
        ? `€${v.salaryFrom}${v.salaryTo ? `–€${v.salaryTo}` : ""}/mo`
        : null,
    postedAt: v.publishDate ? new Date(v.publishDate) : null,
  }));
}

// Arbeitnow: free EU job board API (no key). No server-side search, so
// results are filtered against the query locally.
async function fetchArbeitnow(query: string): Promise<RawJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Arbeitnow responded ${res.status}`);
  const data = (await res.json()) as {
    data: Array<{
      slug: string;
      company_name: string;
      title: string;
      description: string;
      remote: boolean;
      url: string;
      location: string;
      created_at: number;
    }>;
  };
  const terms = tokenize(query);
  return data.data
    .filter((j) => {
      const hay = j.title.toLowerCase();
      return terms.some((t) => hay.includes(t));
    })
    .slice(0, 20)
    .map((j) => ({
      source: "arbeitnow",
      externalId: j.slug,
      title: j.title,
      company: j.company_name,
      location: j.remote ? `${j.location || "EU"} (Remote OK)` : j.location || "EU",
      url: j.url,
      description: stripHtml(j.description).slice(0, MAX_DESCRIPTION_CHARS),
      postedAt: j.created_at ? new Date(j.created_at * 1000) : null,
    }));
}

// --- Ingestion --------------------------------------------------------------

export type IngestResult = {
  jobs: Job[];
  providerErrors: string[];
};

// Runs every provider for every search query, dedupes, upserts into the
// jobs table, and returns the stored rows.
export async function searchAndIngestJobs(
  queries: string[],
  location: string
): Promise<IngestResult> {
  const tasks = queries.flatMap((q) => [
    fetchRemotive(q),
    fetchAdzuna(q, location),
    fetchCvEe(q),
    fetchArbeitnow(q),
  ]);
  const settled = await Promise.allSettled(tasks);

  const raw: RawJob[] = [];
  const errors = new Set<string>();
  for (const result of settled) {
    if (result.status === "fulfilled") raw.push(...result.value);
    else errors.add(String(result.reason?.message ?? result.reason));
  }

  const seen = new Set<string>();
  const unique = raw.filter((j) => {
    const key = `${j.source}:${j.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0)
    return { jobs: [], providerErrors: [...errors] };

  await db.insert(jobs).values(unique).onConflictDoNothing();

  const externalIds = unique.map((j) => j.externalId);
  const stored = await db.query.jobs.findMany({
    where: inArray(jobs.externalId, externalIds),
  });
  const wanted = new Set(unique.map((j) => `${j.source}:${j.externalId}`));

  return {
    jobs: stored.filter((j) => wanted.has(`${j.source}:${j.externalId}`)),
    providerErrors: [...errors],
  };
}

// --- Keyword scoring (retrieval + no-AI fallback) ---------------------------

const STOPWORDS = new Set(
  "the and for with you your our their this that will are was were has have had can may not from into over under more most other some such only own same than too very just also been being does doing about above after again all any because before below between both during each few further here how its itself off once out she they them then there these those through until what when where which while who whom why".split(
    " "
  )
);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) ?? []).filter(
    (t) => !STOPWORDS.has(t)
  );
}

export function keywordScore(resumeText: string, job: Job): number {
  const resumeTerms = new Set(tokenize(resumeText));
  const jobTerms = new Set(tokenize(`${job.title} ${job.description ?? ""}`));
  if (jobTerms.size === 0) return 0;

  let matched = 0;
  for (const term of jobTerms) if (resumeTerms.has(term)) matched++;

  const titleTerms = tokenize(job.title);
  const titleMatched = titleTerms.filter((t) => resumeTerms.has(t)).length;
  const titleBonus =
    titleTerms.length > 0 ? (titleMatched / titleTerms.length) * 0.35 : 0;

  return Math.min(1, matched / Math.min(jobTerms.size, 60) + titleBonus);
}

// Skills/terms a job shares with the resume.
export function sharedKeywords(resumeText: string, job: Job): string[] {
  const resumeTerms = new Set(tokenize(resumeText));
  const jobTerms = tokenize(`${job.title} ${job.description ?? ""}`);
  const shared: string[] = [];
  const seen = new Set<string>();
  for (const term of jobTerms) {
    if (term.length >= 4 && resumeTerms.has(term) && !seen.has(term)) {
      seen.add(term);
      shared.push(term);
    }
  }
  return shared.slice(0, 14);
}

// Frequent job-posting terms missing from the resume.
export function missingKeywords(resumeText: string, job: Job): string[] {
  const resumeTerms = new Set(tokenize(resumeText));
  const counts = new Map<string, number>();
  for (const term of tokenize(`${job.title} ${job.description ?? ""}`)) {
    if (term.length >= 4 && !resumeTerms.has(term)) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);
}

// --- Fable 5 fit analysis ----------------------------------------------------

export type FitAnalysis = {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
};

const FIT_SYSTEM = `You are a rigorous technical recruiter evaluating whether ONE candidate fits job postings.
Score fit on an absolute 0–100 scale:
- 85–100: apply immediately — requirements clearly met
- 65–84: strong fit — most requirements met, minor gaps
- 40–64: stretch — real gaps but a case can be made
- 0–39: poor fit — seniority, domain, or hard requirements don't line up
Judge seniority honestly (a new grad is not a fit for "8+ years required"). Weigh transferable strengths (the candidate's AI, IT support, and political science background) where genuinely relevant. Never inflate scores.`;

// Analyze up to `jobList.length` jobs in batches, persisting results on the
// job rows so each posting is only ever analyzed once.
export async function analyzeFits(
  resume: Resume,
  jobList: Job[]
): Promise<void> {
  if (!cursorEnabled()) throw new Error("CURSOR_API_KEY is not set.");
  const pending = jobList.filter((j) => j.fitAnalyzedAt == null);
  if (pending.length === 0) return;

  const model = await resolveFableModel();
  const BATCH = 5;

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const jobsBlock = batch
      .map(
        (j, idx) =>
          `JOB ${idx + 1} (id: ${j.id})\nTitle: ${j.title}\nCompany: ${j.company}\nLocation: ${j.location ?? "n/a"}\nDescription:\n${(j.description ?? "No description").slice(0, 2_500)}`
      )
      .join("\n\n---\n\n");

    const parsed = await generateJSON<{
      results: Array<{
        id: string;
        score: number;
        verdict: string;
        strengths: string[];
        gaps: string[];
      }>;
    }>(
      FIT_SYSTEM,
      `CANDIDATE RESUME:\n${resume.content.slice(0, 8_000)}\n\n=== JOB POSTINGS TO EVALUATE ===\n\n${jobsBlock}`,
      `{"results": [{"id": "<job id echoed back>", "score": 0-100, "verdict": "<one blunt sentence: should they apply and why>", "strengths": ["<2-4 short reasons they fit>"], "gaps": ["<0-4 short missing requirements>"]}]}`
    );

    await Promise.all(
      parsed.results
        .filter((r) => batch.some((j) => j.id === r.id))
        .map((r) =>
          db
            .update(jobs)
            .set({
              fitScore: Math.max(0, Math.min(100, Math.round(r.score))),
              fitVerdict: r.verdict,
              fitStrengths: r.strengths?.slice(0, 4) ?? [],
              fitGaps: r.gaps?.slice(0, 4) ?? [],
              fitAnalyzedAt: new Date(),
            })
            .where(eq(jobs.id, r.id))
        )
    );
    void model;
  }
}

// Analyze a single job (used from the job detail page).
export async function analyzeSingleFit(
  resume: Resume,
  job: Job
): Promise<void> {
  await analyzeFits(resume, [job]);
}
