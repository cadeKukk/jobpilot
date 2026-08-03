"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "Deleting…" : "Delete application"}
    </button>
  );
}
