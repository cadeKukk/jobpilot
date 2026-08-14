import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, generatedDocuments } from "@/db/schema";
import { PrintButton } from "@/components/print-button";
import { formatDate } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Document · JobPilot" };

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const doc = await db.query.generatedDocuments.findFirst({
    where: eq(generatedDocuments.id, id),
  });
  if (!doc) notFound();

  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, doc.applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) notFound();

  const title =
    doc.kind === "resume"
      ? `Résumé — ${app.jobTitle} at ${app.company}`
      : `Cover letter — ${app.jobTitle} at ${app.company}`;

  // Compact, professional print output: collapse extra blank lines and
  // trim trailing whitespace from each line.
  const content = doc.content
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <div className="mx-auto max-w-[8.5in] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/applications/${doc.applicationId}`}
          className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 hover-invert"
        >
          ← BACK TO APPLICATION
        </Link>
        <span className="flex items-center gap-4">
          <a
            href={`/api/documents/${doc.id}/pdf`}
            className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
          >
            DOWNLOAD PDF ↓
          </a>
          <PrintButton />
        </span>
      </div>

      {/* Page chrome, not part of the document. */}
      <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500 print:hidden">
        {title.toUpperCase()}
      </p>

      {/* True-to-output preview: a Letter-width page with the exact print
          margins and type metrics, so the PDF looks identical. */}
      <div className="w-[8.5in] max-w-full border border-neutral-50 bg-white px-[0.7in] py-[0.6in] print:w-auto print:border-0 print:p-0">
        <p className="mb-4 text-right font-mono text-[9px] tracking-[0.16em] text-neutral-400">
          {formatDate(doc.createdAt).toUpperCase()}
        </p>
        <pre className="whitespace-pre-wrap font-sans text-[11px] leading-[1.35] text-neutral-950">
          {content}
        </pre>
      </div>
    </div>
  );
}
