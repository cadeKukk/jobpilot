import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { jobs, resumes, type Job, type Resume } from "@/db/schema";

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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// --- Providers ------------------------------------------------------------

// Remotive: free, no API key, remote jobs only.
async function fetchRemotive(query: string): Promise<RawJob[]> {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(
    query
  )}&limit=40`;
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

// Adzuna: broad coverage incl. on-site roles. Requires free API keys.
async function fetchAdzuna(query: string, location: string): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const country = process.env.ADZUNA_COUNTRY ?? "us";
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    results_per_page: "40",
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

// --- Ingestion --------------------------------------------------------------

export type IngestResult = {
  jobs: Job[];
  providerErrors: string[];
};

// Fetches from all available providers, upserts into the jobs table
// (deduped by source + external id), and returns the stored rows.
export async function searchAndIngestJobs(
  query: string,
  location: string
): Promise<IngestResult> {
  const settled = await Promise.allSettled([
    fetchRemotive(query),
    fetchAdzuna(query, location),
  ]);

  const raw: RawJob[] = [];
  const providerErrors: string[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") raw.push(...result.value);
    else providerErrors.push(String(result.reason?.message ?? result.reason));
  }

  const seen = new Set<string>();
  const unique = raw.filter((j) => {
    const key = `${j.source}:${j.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) return { jobs: [], providerErrors };

  await db.insert(jobs).values(unique).onConflictDoNothing();

  const externalIds = unique.map((j) => j.externalId);
  const stored = await db.query.jobs.findMany({
    where: inArray(jobs.externalId, externalIds),
  });
  const wanted = new Set(unique.map((j) => `${j.source}:${j.externalId}`));

  return {
    jobs: stored.filter((j) => wanted.has(`${j.source}:${j.externalId}`)),
    providerErrors,
  };
}

// --- Match scoring ----------------------------------------------------------

async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts.map((t) => t.slice(0, 8_000)),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings responded ${res.status}`);
  const data = (await res.json()) as {
    data: Array<{ index: number; embedding: number[] }>;
  };
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

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

function keywordScore(resumeText: string, job: Job): number {
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

async function embeddingScores(
  resume: Resume,
  jobList: Job[]
): Promise<Map<string, number>> {
  let resumeEmbedding = resume.embedding;
  if (!resumeEmbedding) {
    [resumeEmbedding] = await embedTexts([resume.content]);
    await db
      .update(resumes)
      .set({ embedding: resumeEmbedding })
      .where(eq(resumes.id, resume.id));
  }

  const missing = jobList.filter((j) => !j.embedding);
  const BATCH = 64;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const vectors = await embedTexts(
      batch.map((j) => `${j.title} at ${j.company}\n${j.description ?? ""}`)
    );
    await Promise.all(
      batch.map((job, idx) => {
        job.embedding = vectors[idx];
        return db
          .update(jobs)
          .set({ embedding: vectors[idx] })
          .where(eq(jobs.id, job.id));
      })
    );
  }

  const scores = new Map<string, number>();
  for (const job of jobList) {
    scores.set(
      job.id,
      job.embedding ? cosine(resumeEmbedding, job.embedding) : 0
    );
  }
  return scores;
}

export type ScoringMethod = "embeddings" | "keywords";

// Scores jobs against the resume: semantic embeddings when an OpenAI key is
// configured, keyword overlap otherwise. Raw scores are min-max normalized
// into a friendly 35–95% display range.
export async function scoreJobsAgainstResume(
  resume: Resume,
  jobList: Job[]
): Promise<{ percentages: Map<string, number>; method: ScoringMethod }> {
  let raw: Map<string, number>;
  let method: ScoringMethod = "keywords";

  if (process.env.OPENAI_API_KEY) {
    try {
      raw = await embeddingScores(resume, jobList);
      method = "embeddings";
    } catch (err) {
      console.error("Embedding scoring failed, falling back to keywords:", err);
      raw = new Map(
        jobList.map((j) => [j.id, keywordScore(resume.content, j)])
      );
    }
  } else {
    raw = new Map(jobList.map((j) => [j.id, keywordScore(resume.content, j)]));
  }

  const values = [...raw.values()];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;

  const percentages = new Map<string, number>();
  for (const [id, value] of raw) {
    const normalized = spread > 0.000001 ? (value - min) / spread : 0.5;
    percentages.set(id, Math.round(35 + normalized * 60));
  }
  return { percentages, method };
}
