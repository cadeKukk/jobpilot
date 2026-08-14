"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btnSolid } from "@/components/editorial";
import { runFitAnalysis } from "@/lib/fit-actions";

// Triggers Fable 5 fit analysis for the given (unanalyzed) jobs.
export function AnalyzeButton({
  jobIds,
  label,
}: {
  jobIds: string[];
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (jobIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        className={btnSolid}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await runFitAnalysis(jobIds);
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {isPending
          ? "ANALYZING WITH FABLE 5…"
          : (label ?? `RUN FIT ANALYSIS — ${jobIds.length} NEW`)}
      </button>
      {isPending && (
        <span className="font-mono text-[10px] tracking-[0.18em] text-neutral-400">
          ~10–30S PER BATCH
        </span>
      )}
      {error && <span className="text-sm text-neutral-500">{error}</span>}
    </div>
  );
}
