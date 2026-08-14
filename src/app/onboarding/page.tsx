import Link from "next/link";
import {
  MonoLabel,
  SectionMark,
  btnSolid,
  inputBase,
  textareaBase,
} from "@/components/editorial";
import { saveMasterResume } from "@/lib/resume-actions";

export const metadata = { title: "Setup · JobPilot" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <SectionMark text="SEC. 00 — SETUP" />
        <h1 className="text-3xl font-bold tracking-tight">Base résumé.</h1>
        <p className="text-sm text-neutral-400">
          Everything — fit analysis, tailoring, Pilot, autofill — is built from
          this document.
        </p>
      </div>

      <form action={saveMasterResume} className="space-y-8">
        <section className="space-y-4 border-t border-neutral-50 pt-6">
          <SectionMark text="01 — UPLOAD OR PASTE" />
          <label className="block space-y-1.5">
            <MonoLabel>PDF UPLOAD</MonoLabel>
            <input
              type="file"
              name="resumeFile"
              accept="application/pdf"
              className="block w-full cursor-pointer border border-neutral-700 bg-neutral-900 text-sm text-neutral-400 file:mr-3 file:cursor-pointer file:border-0 file:bg-neutral-50 file:px-4 file:py-2.5 file:font-mono file:text-[11px] file:tracking-[0.14em] file:text-neutral-950"
            />
          </label>
          <p className="text-center font-mono text-[10px] tracking-[0.22em] text-neutral-500">
            — OR —
          </p>
          <label className="block space-y-1.5">
            <MonoLabel>PLAIN TEXT</MonoLabel>
            <textarea
              name="resumeText"
              rows={8}
              placeholder="Paste your résumé content here…"
              className={textareaBase}
            />
          </label>
        </section>

        <section className="space-y-4 border-t border-neutral-50 pt-6">
          <SectionMark text="02 — LINKEDIN EXPERIENCE (OPTIONAL)" />
          <p className="text-sm leading-relaxed text-neutral-400">
            LinkedIn doesn&apos;t allow automated profile reads — copy the{" "}
            <em>About</em> and <em>Experience</em> sections from{" "}
            <a
              href="https://www.linkedin.com/in/me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-invert underline decoration-2 underline-offset-2"
            >
              your profile
            </a>{" "}
            and paste them below.
          </p>
          <textarea
            name="linkedinText"
            rows={5}
            placeholder="About: …&#10;&#10;Experience: …"
            className={textareaBase}
          />
        </section>

        <section className="space-y-4 border-t border-neutral-50 pt-6">
          <SectionMark text="03 — WHAT ARE YOU LOOKING FOR" />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1">
              <MonoLabel>PRIMARY ROLE</MonoLabel>
              <input
                name="desiredRole"
                placeholder="software engineer"
                className={inputBase}
              />
            </label>
            <label className="block space-y-1">
              <MonoLabel>LOCATION HINT</MonoLabel>
              <input
                name="location"
                placeholder="Remote, Virginia, Estonia…"
                className={inputBase}
              />
            </label>
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-neutral-50 pt-6">
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
          >
            SKIP FOR NOW
          </Link>
          <button type="submit" className={btnSolid}>
            SAVE & FIND MATCHES →
          </button>
        </div>
      </form>
    </div>
  );
}
