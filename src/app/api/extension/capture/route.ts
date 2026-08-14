import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { stripHtml } from "@/lib/jobs";

// Job capture from the Chrome extension: the popup extracts a posting from
// the current page (JSON-LD JobPosting → meta tags → headings) and posts it
// here. Deduped by URL so re-capturing the same posting is a no-op.
export async function POST(request: Request) {
  let body: {
    title?: string;
    company?: string;
    location?: string;
    description?: string;
    url?: string;
    salaryText?: string;
    postedAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const company = body.company?.trim();
  const url = body.url?.trim();
  if (!title || !company || !url) {
    return Response.json(
      { error: "Couldn't read a job title and company from this page." },
      { status: 422 }
    );
  }

  // Same posting captured before (externalId doubles as the canonical URL).
  const existing = await db.query.jobs.findFirst({
    where: and(eq(jobs.source, "extension"), eq(jobs.externalId, url)),
    columns: { id: true },
  });
  if (existing) {
    return Response.json({ jobId: existing.id, existed: true });
  }

  const postedAt = body.postedAt ? new Date(body.postedAt) : null;
  const [job] = await db
    .insert(jobs)
    .values({
      source: "extension",
      externalId: url,
      title: title.slice(0, 300),
      company: company.slice(0, 300),
      location: body.location?.trim().slice(0, 300) || null,
      url,
      description: body.description
        ? stripHtml(body.description).slice(0, 30_000)
        : null,
      salaryText: body.salaryText?.trim().slice(0, 200) || null,
      postedAt: postedAt && !isNaN(postedAt.getTime()) ? postedAt : null,
    })
    .returning({ id: jobs.id });

  return Response.json({ jobId: job.id, existed: false });
}
