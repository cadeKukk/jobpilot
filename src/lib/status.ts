import type { ApplicationStatus } from "@/db/schema";

// Monochrome status treatment: weight and fill carry the hierarchy.
export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; badge: string; dot: string }
> = {
  saved: {
    label: "Saved",
    badge: "border-neutral-700 bg-transparent text-neutral-400",
    dot: "bg-neutral-500",
  },
  applied: {
    label: "Applied",
    badge: "border-neutral-50 bg-transparent text-neutral-50",
    dot: "bg-neutral-50",
  },
  interviewing: {
    label: "Interviewing",
    badge: "border-neutral-50 bg-neutral-800 text-neutral-50",
    dot: "bg-neutral-50",
  },
  offer: {
    label: "Offer",
    badge: "border-neutral-50 bg-neutral-50 text-neutral-950",
    dot: "bg-neutral-900",
  },
  rejected: {
    label: "Rejected",
    badge: "border-neutral-700 bg-transparent text-neutral-500 line-through",
    dot: "bg-neutral-700",
  },
  withdrawn: {
    label: "Withdrawn",
    badge: "border-neutral-700 bg-transparent text-neutral-500",
    dot: "bg-neutral-700",
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
