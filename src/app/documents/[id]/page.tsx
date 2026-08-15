import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, generatedDocuments, userPreferences } from "@/db/schema";
import {
  DocumentRender,
  isDocStyle,
  type DocStyleId,
} from "@/components/document-render";
import { OnePageFit } from "@/components/one-page-fit";
import { PrintButton } from "@/components/print-button";
import { StylePicker } from "@/components/style-picker";
import { formatDate } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Document · JobPilot" };

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ style?: string }>;
}) {
  const { id } = await params;
  const { style: styleParam } = await searchParams;
  const user = await getCurrentUser();

  const doc = await db.query.generatedDocuments.findFirst({
    where: eq(generatedDocuments.id, id),
  });
  if (!doc) notFound();

  const [app, prefs] = await Promise.all([
    db.query.applications.findFirst({
      where: and(
        eq(applications.id, doc.applicationId),
        eq(applications.userId, user.id)
      ),
    }),
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, user.id),
    }),
  ]);
  if (!app) notFound();

  const style: DocStyleId = isDocStyle(styleParam)
    ? styleParam
    : isDocStyle(prefs?.docStyle)
      ? prefs.docStyle
      : "classic";

  const title =
    doc.kind === "resume"
      ? `Résumé — ${app.jobTitle} at ${app.company}`
      : `Cover letter — ${app.jobTitle} at ${app.company}`;

  // Collapse extra blank lines and trailing whitespace for clean rendering.
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
            href={`/api/documents/${doc.id}/pdf?style=${style}`}
            className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
          >
            DOWNLOAD PDF ↓
          </a>
          <PrintButton />
        </span>
      </div>

      {/* Page chrome, not part of the document. */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
          {title.toUpperCase()} · {formatDate(doc.createdAt).toUpperCase()}
        </p>
        <StylePicker current={style} />
      </div>

      {/* True-to-output preview: an exact Letter page (8.5×11in) with the
          real print margins. Content auto-shrinks to fit ONE page; the PDF
          renders this same page, so screen and file are identical. */}
      <div className="h-[11in] w-[8.5in] max-w-full overflow-hidden border border-neutral-50 bg-white px-[0.7in] py-[0.6in] print:h-auto print:w-auto print:overflow-visible print:border-0 print:p-0">
        <OnePageFit maxHeightPx={940}>
          <DocumentRender
            kind={doc.kind}
            content={content}
            styleId={style}
            dateLabel={formatDate(doc.createdAt)}
          />
        </OnePageFit>
      </div>
    </div>
  );
}
