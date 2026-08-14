"use client";

import { useTransition } from "react";
import { deleteApplication } from "@/lib/actions";

export function DeleteApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this application and all its history?")) {
          startTransition(() => deleteApplication(applicationId));
        }
      }}
      className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert hover:line-through disabled:opacity-40"
    >
      {isPending ? "DELETING…" : "DELETE APPLICATION ×"}
    </button>
  );
}
