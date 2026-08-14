import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  contacts,
  generatedDocuments,
} from "@/db/schema";
import { DeleteApplicationButton } from "@/components/delete-application-button";
import { MonoLabel, SectionMark, btnOutline, inputBase } from "@/components/editorial";
import { StatusBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/status-select";
import { TailorDocuments } from "@/components/tailor-documents";
import { addContact, addNote } from "@/lib/actions";
import { cursorEnabled } from "@/lib/cursor-ai";
import { getMasterResume } from "@/lib/resume";
import { formatDate } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const app = await db.query.applications.findFirst({
    where: and(eq(applications.id, id), eq(applications.userId, user.id)),
  });
  if (!app) notFound();

  const [events, appContacts, docs, masterResume] = await Promise.all([
    db.query.applicationEvents.findMany({
      where: eq(applicationEvents.applicationId, id),
      orderBy: [desc(applicationEvents.occurredAt)],
    }),
    db.query.contacts.findMany({
      where: eq(contacts.applicationId, id),
      orderBy: [asc(contacts.createdAt)],
    }),
    db.query.generatedDocuments.findMany({
      where: eq(generatedDocuments.applicationId, id),
      orderBy: [desc(generatedDocuments.createdAt)],
    }),
    getMasterResume(user.id),
  ]);

  const aiEnabled = cursorEnabled();

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 hover-invert"
      >
        ← BACK TO TRACKER
      </Link>

      <div className="space-y-3 border-b border-neutral-50 pb-6">
        <SectionMark text="SEC. 02 — APPLICATION" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">
              {app.jobTitle}
            </h1>
            <p className="mt-1 text-lg text-neutral-400">{app.company}</p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.16em] text-neutral-500">
              {[
                app.location && `LOC — ${app.location.toUpperCase()}`,
                app.salary && `SAL — ${app.salary.toUpperCase()}`,
                `ADDED — ${formatDate(app.createdAt).toUpperCase()}`,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          </div>
          <StatusSelect applicationId={app.id} status={app.status} />
        </div>
        {app.jobUrl && (
          <a
            href={app.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
          >
            VIEW ORIGINAL POSTING ↗
          </a>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="space-y-4">
            <SectionMark text="TAILORED DOCUMENTS — FABLE 5" />
            {!aiEnabled ? (
              <p className="text-sm text-neutral-400">
                Set <code className="bg-neutral-800 px-1">CURSOR_API_KEY</code>{" "}
                in .env to generate a résumé and cover letter tailored to this
                job.
              </p>
            ) : !masterResume ? (
              <p className="text-sm text-neutral-400">
                <Link
                  href="/onboarding"
                  className="hover-invert underline decoration-2 underline-offset-2"
                >
                  Add your base résumé
                </Link>{" "}
                first — tailored documents are generated from it.
              </p>
            ) : (
              <TailorDocuments
                applicationId={app.id}
                docs={docs.map((d) => ({
                  id: d.id,
                  kind: d.kind,
                  content: d.content,
                  createdAt: d.createdAt.toISOString(),
                }))}
              />
            )}
          </section>

          {app.jobDescription && (
            <section className="space-y-4 border-t border-neutral-800 pt-6">
              <SectionMark text="JOB DESCRIPTION" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                {app.jobDescription}
              </p>
            </section>
          )}

          {app.notes && (
            <section className="space-y-4 border-t border-neutral-800 pt-6">
              <SectionMark text="NOTES" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                {app.notes}
              </p>
            </section>
          )}

          <section className="space-y-4 border-t border-neutral-800 pt-6">
            <SectionMark text="ACTIVITY LOG" />
            <form action={addNote.bind(null, app.id)} className="flex gap-3">
              <input
                name="note"
                placeholder="Add a note — interview scheduled, follow-up sent…"
                className={inputBase}
              />
              <button type="submit" className={btnOutline}>
                ADD +
              </button>
            </form>

            <ol className="border-t border-neutral-800">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-baseline gap-4 border-b border-neutral-800 py-3"
                >
                  <span className="w-24 shrink-0 font-mono text-[10px] tracking-[0.14em] text-neutral-500">
                    {formatDate(event.occurredAt).toUpperCase()}
                  </span>
                  {event.type === "status_change" &&
                  event.fromStatus &&
                  event.toStatus ? (
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <StatusBadge status={event.fromStatus} />
                      <span className="text-neutral-500">→</span>
                      <StatusBadge status={event.toStatus} />
                    </span>
                  ) : (
                    <p className="text-sm text-neutral-300">{event.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-3 border border-neutral-50 p-5">
            <SectionMark text="DETAILS" />
            <dl className="space-y-2.5">
              <DetailRow label="SALARY" value={app.salary ?? "—"} />
              <DetailRow label="APPLIED" value={formatDate(app.appliedAt)} />
              <DetailRow label="ADDED" value={formatDate(app.createdAt)} />
              <DetailRow label="UPDATED" value={formatDate(app.updatedAt)} />
            </dl>
          </section>

          <section className="space-y-4">
            <SectionMark text="CONTACTS" />
            {appContacts.length > 0 && (
              <ul className="space-y-3">
                {appContacts.map((contact) => (
                  <li key={contact.id} className="text-sm">
                    <p className="font-semibold">{contact.name}</p>
                    <p className="font-mono text-[10px] tracking-[0.14em] text-neutral-500">
                      {[contact.role, contact.email]
                        .filter(Boolean)
                        .join("  ·  ")
                        .toUpperCase() || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form action={addContact.bind(null, app.id)} className="space-y-3">
              <input name="name" placeholder="Name" className={inputBase} />
              <input
                name="role"
                placeholder="Role (recruiter, hiring manager…)"
                className={inputBase}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className={inputBase}
              />
              <button type="submit" className={btnOutline}>
                ADD CONTACT +
              </button>
            </form>
          </section>

          <section className="space-y-3 border-t border-neutral-800 pt-6">
            <MonoLabel>DANGER ZONE</MonoLabel>
            <DeleteApplicationButton applicationId={app.id} />
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] tracking-[0.16em] text-neutral-500">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
