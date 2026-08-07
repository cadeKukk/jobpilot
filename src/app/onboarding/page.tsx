import Link from "next/link";
import { FileText, Import, Search, Sparkles } from "lucide-react";
import { saveMasterResume } from "@/lib/resume-actions";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Set up your profile · JobPilot" };

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">
          Welcome, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your resume powers everything in JobPilot — tailored documents and
          job matching are built from it.
        </p>
      </div>

      <form
        action={saveMasterResume}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
      >
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">1. Add your resume</h2>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm text-slate-600">Upload a PDF</span>
            <input
              type="file"
              name="resumeFile"
              accept="application/pdf"
              className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-500 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </label>
          <p className="text-center text-xs text-slate-400">— or —</p>
          <label className="block space-y-1.5">
            <span className="text-sm text-slate-600">Paste it as text</span>
            <textarea
              name="resumeText"
              rows={6}
              placeholder="Paste your resume content here…"
              className={inputClass}
            />
          </label>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <Import className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">
              2. Add your LinkedIn experience{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            LinkedIn doesn&apos;t allow apps to read profiles automatically, so
            copy the <em>About</em> and <em>Experience</em> sections from{" "}
            <a
              href="https://www.linkedin.com/in/me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              your profile
            </a>{" "}
            and paste them below. It enriches matching and tailoring.
          </p>
          <textarea
            name="linkedinText"
            rows={5}
            placeholder="About: …&#10;&#10;Experience: …"
            className={inputClass}
          />
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">
              3. What are you looking for?
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            We&apos;ll use this to automatically find and rank job matches for
            you.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm text-slate-600">Role</span>
              <input
                name="desiredRole"
                placeholder="Frontend engineer"
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-slate-600">Location</span>
              <input
                name="location"
                placeholder="Remote, New York…"
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            Skip for now
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            <Sparkles className="h-4 w-4" />
            Finish setup
          </button>
        </div>
      </form>
    </div>
  );
}
