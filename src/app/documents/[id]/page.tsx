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

  // Compact, professional print output: collapse extra blank lines and
  // trim trailing whitespace from each line.
  const content = doc.content
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/applications/${doc.applicationId}`}
          className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 hover-invert"
        >
          ← BACK TO APPLICATION
        </Link>
        <PrintButton />
      </div>

      {/* Rendered as a white "paper" artifact so it reads as a document
          on the dark UI and prints black-on-white. */}
      <div className="border border-neutral-50 bg-white p-8 print:border-0 print:p-0">
        <p className="mb-5 text-right font-mono text-[9px] tracking-[0.16em] text-neutral-400 print:mb-4">
          {formatDate(doc.createdAt).toUpperCase()}
        </p>
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-[1.45] text-neutral-950 print:text-[11px] print:leading-[1.35]">
          {content}
        </pre>
      </div>
    </div>
  );
}
