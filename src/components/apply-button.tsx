"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { btnSolid } from "@/components/editorial";
import { startApplication } from "@/lib/workspace-actions";

// APPLY: saves the job to the tracker and opens the tailoring workspace,
// where the tailored resume is drafted before applying on the company site.
export function ApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={btnSolid}
      onClick={() =>
        startTransition(async () => {
          const { applicationId } = await startApplication(jobId);
          router.push(`/applications/${applicationId}/tailor`);
        })
      }
    >
      {isPending ? "OPENING WORKSPACE…" : "APPLY — TAILOR RÉSUMÉ →"}
    </button>
  );
}
