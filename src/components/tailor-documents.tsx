"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Copy, FileText, Printer, Sparkles } from "lucide-react";
import { generateTailoredDocuments } from "@/lib/tailor-actions";

type Doc = {
  id: string;
  kind: string;
  content: string;
  createdAt: string;
};

export function TailorDocuments({
  applicationId,
  docs,
}: {
  applicationId: string;
  docs: Doc[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const latestResume = docs.find((d) => d.kind === "resume");
  const latestCover = docs.find((d) => d.kind === "cover_letter");
  const hasDocs = latestResume || latestCover;

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateTailoredDocuments(applicationId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {hasDocs
            ? "Generated from your master resume and this job's description."
            : "Generate a resume and cover letter tailored to this job from your master resume."}
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {isPending
            ? "Generating… (~20s)"
            : hasDocs
              ? "Regenerate"
              : "Tailor documents"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {latestResume && (
        <DocumentPanel title="Tailored resume" doc={latestResume} />
      )}
      {latestCover && <DocumentPanel title="Cover letter" doc={latestCover} />}
    </div>
  );
}

function DocumentPanel({ title, doc }: { title: string; doc: Doc }) {
  const [copied, setCopied] = useState(false);

  return (
    <details className="group rounded-lg border border-slate-200" open>
      <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          {title}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              navigator.clipboard.writeText(doc.content).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy"}
          </button>
          <Link
            href={`/documents/${doc.id}`}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / PDF
          </Link>
        </span>
      </summary>
      <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-sans text-sm leading-relaxed text-slate-700">
        {doc.content}
      </pre>
    </details>
  );
}
