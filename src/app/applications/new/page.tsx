import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APPLICATION_STATUSES } from "@/db/schema";
import { createApplication } from "@/lib/actions";
import { STATUS_META } from "@/lib/status";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add application</h1>
        <p className="mt-1 text-sm text-slate-500">
          Save a job you&apos;re interested in or one you&apos;ve already
          applied to.
        </p>
      </div>

      <form
        action={createApplication}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" required>
            <input
              name="company"
              required
              placeholder="Acme Inc."
              className={inputClass}
            />
          </Field>
          <Field label="Job title" required>
            <input
              name="jobTitle"
              required
              placeholder="Software Engineer"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <input
              name="location"
              placeholder="Remote, New York, NY…"
              className={inputClass}
            />
          </Field>
          <Field label="Salary range">
            <input
              name="salary"
              placeholder="$120k – $150k"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job posting URL">
            <input
              name="jobUrl"
              type="url"
              placeholder="https://…"
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="saved" className={inputClass}>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Job description">
          <textarea
            name="jobDescription"
            rows={5}
            placeholder="Paste the job description here — it powers resume tailoring later."
            className={inputClass}
          />
        </Field>

        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            placeholder="Referrals, deadlines, first impressions…"
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Save application
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
