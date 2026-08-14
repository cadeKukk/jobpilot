import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, generatedDocuments } from "@/db/schema";
import { SectionMark } from "@/components/editorial";
import { TailorWorkspace } from "@/components/tailor-workspace";
import { cursorEnabled } from "@/lib/cursor-ai";
import { extractPostingKeywords } from "@/lib/jobs";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Tailor · JobPilot" };

export default async function TailorWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const app = await db.query.applications.findFirst({
    where: and(eq(applications.id, id), eq(applications.userId, user.id)),
  });
  if (!app) notFound();

  const [docs, masterResume] = await Promise.all([
    db.query.generatedDocuments.findMany({
      where: eq(generatedDocuments.applicationId, id),
      orderBy: [desc(generatedDocuments.createdAt)],
    }),
    getMasterResume(user.id),
  ]);

  const keywords = app.jobDescription
    ? extractPostingKeywords(app.jobDescription, app.jobTitle)
    : extractPostingKeywords(app.jobTitle, app.jobTitle);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="space-y-2">
          <Link
            href={`/applications/${app.id}`}
            className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 hover-invert"
          >
            ← BACK TO APPLICATION
          </Link>
          <SectionMark text="SEC. 02 — TAILORING WORKSPACE" />
          <h1 className="text-3xl font-bold tracking-tight">{app.jobTitle}</h1>
          <p className="text-neutral-400">{app.company}</p>
        </div>
      </div>

      <TailorWorkspace
        applicationId={app.id}
        jobUrl={app.jobUrl}
        keywords={keywords}
        aiEnabled={cursorEnabled()}
        hasResume={!!masterResume}
        baseResumeContent={masterResume?.content ?? ""}
        initialVersions={docs.map((d) => ({
          id: d.id,
          kind: d.kind as "resume" | "cover_letter",
          content: d.content,
          model: d.model,
          createdAt: d.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
