"use client";

import { useTransition } from "react";
import { btnGhost } from "@/components/editorial";
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
      <span className="font-mono text-[11px] tracking-[0.14em] text-neutral-950">
        ✓ IN TRACKER
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => saveJobToTracker(jobId))}
      className={btnGhost}
    >
      {isPending ? "SAVING…" : "SAVE +"}
    </button>
  );
}
