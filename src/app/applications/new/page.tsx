import Link from "next/link";
import { APPLICATION_STATUSES } from "@/db/schema";
import {
  MonoLabel,
  SectionMark,
  btnSolid,
  inputBase,
  textareaBase,
} from "@/components/editorial";
import { createApplication } from "@/lib/actions";
import { STATUS_META } from "@/lib/status";

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 hover-invert"
        >
          ← BACK TO TRACKER
        </Link>
        <SectionMark text="SEC. 02 — NEW ENTRY" />
        <h1 className="text-3xl font-bold tracking-tight">Add application.</h1>
      </div>

      <form action={createApplication} className="space-y-6 border-t border-neutral-50 pt-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="COMPANY *">
            <input
              name="company"
              required
              placeholder="Acme Inc."
              className={inputBase}
            />
          </Field>
          <Field label="JOB TITLE *">
            <input
              name="jobTitle"
              required
              placeholder="Software Engineer"
              className={inputBase}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="LOCATION">
            <input
              name="location"
              placeholder="Remote, Tallinn…"
              className={inputBase}
            />
          </Field>
          <Field label="SALARY RANGE">
            <input
              name="salary"
              placeholder="$90k – $120k"
              className={inputBase}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="JOB POSTING URL">
            <input
              name="jobUrl"
              type="url"
              placeholder="https://…"
              className={inputBase}
            />
          </Field>
          <Field label="STATUS">
            <select name="status" defaultValue="saved" className={inputBase}>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="JOB DESCRIPTION">
          <textarea
            name="jobDescription"
            rows={5}
            placeholder="Paste the job description here — it powers résumé tailoring."
            className={textareaBase}
          />
        </Field>

        <Field label="NOTES">
          <textarea
            name="notes"
            rows={3}
            placeholder="Referrals, deadlines, first impressions…"
            className={textareaBase}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-neutral-50 pt-6">
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
          >
            CANCEL
          </Link>
          <button type="submit" className={btnSolid}>
            SAVE APPLICATION →
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <MonoLabel>{label}</MonoLabel>
      {children}
    </label>
  );
}
