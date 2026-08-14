"use client";

import { useTransition } from "react";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/schema";
import { updateApplicationStatus } from "@/lib/actions";
import { STATUS_META } from "@/lib/status";

export function StatusSelect({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as ApplicationStatus;
        startTransition(() => updateApplicationStatus(applicationId, next));
      }}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] outline-none transition disabled:opacity-50 ${STATUS_META[status].badge}`}
      aria-label="Application status"
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
