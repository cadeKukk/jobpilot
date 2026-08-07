import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Plus,
  User,
} from "lucide-react";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  contacts,
  generatedDocuments,
} from "@/db/schema";
import { DeleteApplicationButton } from "@/components/delete-application-button";
import { StatusBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/status-select";
import { TailorDocuments } from "@/components/tailor-documents";
import { addContact, addNote } from "@/lib/actions";
import { getMasterResume } from "@/lib/resume";
import { formatDate } from "@/lib/status";
import { getCurrentUser } from "@/lib/user";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

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

  const openaiConfigured = !!process.env.OPENAI_API_KEY;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{app.jobTitle}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-slate-600">
            <span className="font-medium">{app.company}</span>
            {app.location && <span>{app.location}</span>}
            {app.jobUrl && (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                View posting
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </p>
        </div>
        <StatusSelect applicationId={app.id} status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="AI-tailored documents">
            {!openaiConfigured ? (
              <p className="text-sm text-slate-500">
                Add an AI API key to{" "}
                <code className="rounded bg-slate-100 px-1">.env</code> to
                generate a resume and cover letter tailored to this job.
                Google&apos;s Gemini API works free of charge — see
                &ldquo;AI setup&rdquo; in the README.
              </p>
            ) : !masterResume ? (
              <p className="text-sm text-slate-500">
                <Link
                  href="/onboarding"
                  className="text-blue-600 hover:underline"
                >
                  Add your master resume
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
          </Card>

          {app.jobDescription && (
            <Card title="Job description">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {app.jobDescription}
              </p>
            </Card>
          )}

          {app.notes && (
            <Card title="Notes">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {app.notes}
              </p>
            </Card>
          )}

          <Card title="Activity">
            <form action={addNote.bind(null, app.id)} className="mb-4 flex gap-2">
              <input
                name="note"
                placeholder="Add a note — interview scheduled, follow-up sent…"
                className={inputClass}
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <ul className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    {event.type === "status_change" &&
                    event.fromStatus &&
                    event.toStatus ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <StatusBadge status={event.fromStatus} />
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <StatusBadge status={event.toStatus} />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700">{event.note}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDate(event.occurredAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <dl className="space-y-3 text-sm">
              <DetailRow label="Salary" value={app.salary ?? "—"} />
              <DetailRow label="Applied" value={formatDate(app.appliedAt)} />
              <DetailRow label="Added" value={formatDate(app.createdAt)} />
              <DetailRow label="Last updated" value={formatDate(app.updatedAt)} />
            </dl>
          </Card>

          <Card title="Contacts">
            {appContacts.length > 0 && (
              <ul className="mb-4 space-y-3">
                {appContacts.map((contact) => (
                  <li key={contact.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <User className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-slate-500">
                        {[contact.role, contact.email]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form action={addContact.bind(null, app.id)} className="space-y-2">
              <input name="name" placeholder="Name" className={inputClass} />
              <input
                name="role"
                placeholder="Role (recruiter, hiring manager…)"
                className={inputClass}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className={inputClass}
              />
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Add contact
              </button>
            </form>
          </Card>

          <Card title="Danger zone">
            <DeleteApplicationButton applicationId={app.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}
