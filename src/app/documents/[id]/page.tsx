import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
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

  // Ownership check via the parent application.
  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, doc.applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) notFound();

  const title =
    doc.kind === "resume"
      ? `Resume — ${app.jobTitle} at ${app.company}`
      : `Cover letter — ${app.jobTitle} at ${app.company}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/applications/${doc.applicationId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to application
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        <p className="mb-6 text-xs text-slate-400 print:hidden">
          {title} · Generated {formatDate(doc.createdAt)}
        </p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-900">
          {doc.content}
        </pre>
      </div>
    </div>
  );
}
