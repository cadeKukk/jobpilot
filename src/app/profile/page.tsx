import Link from "next/link";
import { FileText, UserRound } from "lucide-react";
import { updateMasterResume } from "@/lib/resume-actions";
import { getMasterResume } from "@/lib/resume";
import { formatDate } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Profile · JobPilot" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const master = await getMasterResume(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your account and the master resume that powers tailoring and
          matching.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">Master resume</h2>
          </div>
          {master && (
            <span className="text-xs text-slate-400">
              Updated {formatDate(master.createdAt)}
            </span>
          )}
        </div>

        {master ? (
          <form action={updateMasterResume} className="space-y-3">
            <textarea
              name="content"
              rows={16}
              defaultValue={master.content}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <div className="flex items-center justify-between">
              <Link
                href="/onboarding"
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Re-upload from PDF instead
              </Link>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-slate-500">
              You haven&apos;t added a resume yet. It&apos;s the foundation for
              tailored documents and job matching.
            </p>
            <Link
              href="/onboarding"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Add your resume
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
