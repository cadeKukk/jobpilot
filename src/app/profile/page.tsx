import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import {
  MonoLabel,
  SectionMark,
  btnSolid,
  inputBase,
  textareaBase,
} from "@/components/editorial";
import { saveSearchQueries } from "@/lib/fit-actions";
import { updateMasterResume } from "@/lib/resume-actions";
import { getMasterResume } from "@/lib/resume";
import { formatDate } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export const metadata = { title: "Profile · JobPilot" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const [master, prefs] = await Promise.all([
    getMasterResume(user.id),
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, user.id),
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <SectionMark text="SEC. 04 — PROFILE" />
        <h1 className="text-3xl font-bold tracking-tight">{user.name}.</h1>
        <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
          {user.email.toUpperCase()} · SINGLE-USER BUILD
        </p>
      </div>

      <section className="space-y-4 border-t border-neutral-50 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionMark text="SEARCH PHRASES" />
          <MonoLabel>EVERY SOURCE IS QUERIED WITH EACH LINE</MonoLabel>
        </div>
        <form action={saveSearchQueries} className="max-w-xl space-y-4">
          <textarea
            name="queries"
            rows={4}
            defaultValue={(prefs?.searchQueries ?? []).join("\n")}
            placeholder={"software engineer\nAI engineer\nIT specialist"}
            className={`${textareaBase} font-mono text-xs`}
          />
          <label className="block space-y-1">
            <MonoLabel>LOCATION HINT (FOR ADZUNA / US ROLES)</MonoLabel>
            <input
              name="location"
              defaultValue={prefs?.location ?? ""}
              placeholder="Virginia, Remote…"
              className={inputBase}
            />
          </label>
          <button type="submit" className={btnSolid}>
            SAVE SEARCHES
          </button>
        </form>
      </section>

      <section className="space-y-4 border-t border-neutral-50 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionMark text="BASE RÉSUMÉ" />
          {master && (
            <MonoLabel>
              UPDATED — {formatDate(master.createdAt).toUpperCase()}
            </MonoLabel>
          )}
        </div>

        {master ? (
          <form action={updateMasterResume} className="space-y-4">
            <textarea
              name="content"
              rows={18}
              defaultValue={master.content}
              className={`${textareaBase} font-mono text-xs`}
            />
            <div className="flex items-center justify-between">
              <Link
                href="/onboarding"
                className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
              >
                RE-UPLOAD FROM PDF →
              </Link>
              <button type="submit" className={btnSolid}>
                SAVE RÉSUMÉ
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-400">
              No base résumé yet — it powers fit analysis, tailoring, Pilot,
              and the autofill extension.
            </p>
            <Link href="/onboarding" className={btnSolid}>
              ADD BASE RÉSUMÉ →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
