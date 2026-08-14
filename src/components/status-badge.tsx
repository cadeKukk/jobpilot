import type { ApplicationStatus } from "@/db/schema";
import { STATUS_META } from "@/lib/status";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
