import type { ApplicationStatus } from "@/db/schema";

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; badge: string; dot: string }
> = {
  saved: {
    label: "Saved",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  applied: {
    label: "Applied",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  interviewing: {
    label: "Interviewing",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  offer: {
    label: "Offer",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  withdrawn: {
    label: "Withdrawn",
    badge: "bg-zinc-100 text-zinc-500 border-zinc-200",
    dot: "bg-zinc-400",
  },
};

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatJobSalary(job: {
  salaryText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
}): string | null {
  if (job.salaryText) return job.salaryText;
  if (job.salaryMin && job.salaryMax) {
    const fmt = (n: number) =>
      n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
    return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`;
  }
  return null;
}
