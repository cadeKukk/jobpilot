"use client";

import { useTransition } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { saveJobToTracker } from "@/lib/job-actions";

export function SaveJobButton({
  jobId,
  saved,
}: {
  jobId: string;
  saved: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        <Check className="h-4 w-4" />
        In tracker
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => saveJobToTracker(jobId))}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
    >
      <BookmarkPlus className="h-4 w-4" />
      {isPending ? "Saving…" : "Save"}
    </button>
  );
}
