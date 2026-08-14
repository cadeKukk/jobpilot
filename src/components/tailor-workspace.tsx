"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MonoLabel, btnOutline, btnSolid } from "@/components/editorial";
import { generateTailoredDocuments } from "@/lib/tailor-actions";
import {
  handoffToExtension,
  reviseDocument,
  saveDocumentVersion,
} from "@/lib/workspace-actions";

type Kind = "resume" | "cover_letter";

type Version = {
  id: string;
  kind: Kind;
  content: string;
  model: string | null;
  createdAt: string;
};

const KIND_LABEL: Record<Kind, string> = {
  resume: "RÉSUMÉ",
  cover_letter: "COVER LETTER",
};

export function TailorWorkspace({
  applicationId,
  jobUrl,
  keywords,
  aiEnabled,
  hasResume,
  baseResumeContent,
  initialVersions,
}: {
  applicationId: string;
  jobUrl: string | null;
  keywords: string[];
  aiEnabled: boolean;
  hasResume: boolean;
  baseResumeContent: string;
  initialVersions: Version[];
}) {
  const [versions, setVersions] = useState<Version[]>(initialVersions);
  const [tab, setTab] = useState<Kind>("resume");
  const [drafts, setDrafts] = useState<Record<Kind, string>>(() => ({
    resume:
      initialVersions.find((v) => v.kind === "resume")?.content ??
      // No draft yet: start from the base resume so manual tailoring is
      // possible even before (or without) generation.
      baseResumeContent,
    cover_letter:
      initialVersions.find((v) => v.kind === "cover_letter")?.content ?? "",
  }));
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handedOff, setHandedOff] = useState(false);
  const [isPending, startTransition] = useTransition();
  const generatedOnce = useRef(false);

  const draft = drafts[tab];
  const tabVersions = versions.filter((v) => v.kind === tab);
  const latest = tabVersions[0];
  const dirty = latest ? draft !== latest.content : draft.trim().length > 0;

  // Generate (or regenerate) both documents with Fable. Previous drafts are
  // never lost — every generation lands as new versions in the history.
  function generateBoth(kind: "initial" | "redo") {
    if (isPending) return;
    setError(null);
    setStatus(
      kind === "redo"
        ? "FABLE 5 IS REDOING BOTH DOCUMENTS FROM SCRATCH…"
        : "FABLE 5 IS DRAFTING YOUR TAILORED RÉSUMÉ + COVER LETTER…"
    );
    startTransition(async () => {
      const res = await generateTailoredDocuments(applicationId);
      if (res.ok) {
        const now = new Date().toISOString();
        const created: Version[] = res.docs.map((d) => ({
          id: d.id,
          kind: d.kind as Kind,
          content: d.content,
          model: d.model,
          createdAt: now,
        }));
        setVersions((v) => [...created, ...v]);
        setDrafts({
          resume:
            created.find((d) => d.kind === "resume")?.content ??
            baseResumeContent,
          cover_letter:
            created.find((d) => d.kind === "cover_letter")?.content ?? "",
        });
        setStatus(null);
      } else {
        setStatus(null);
        setError(res.error);
      }
    });
  }

  // First visit after APPLY: no documents yet — auto-generate both drafts.
  useEffect(() => {
    if (
      !generatedOnce.current &&
      aiEnabled &&
      hasResume &&
      initialVersions.length === 0
    ) {
      generatedOnce.current = true;
      generateBoth("initial");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coverage = useMemo(() => {
    const text = draft.toLowerCase();
    return keywords.map((k) => ({ term: k, hit: text.includes(k.toLowerCase()) }));
  }, [draft, keywords]);
  const hitCount = coverage.filter((c) => c.hit).length;

  function setDraft(value: string) {
    setDrafts((d) => ({ ...d, [tab]: value }));
  }

  function revise() {
    if (!instruction.trim() || isPending) return;
    setError(null);
    setStatus(`FABLE 5 IS REVISING… ("${instruction.slice(0, 60)}")`);
    startTransition(async () => {
      const res = await reviseDocument(applicationId, tab, draft, instruction);
      setStatus(null);
      if (res.ok) {
        setVersions((v) => [
          {
            id: res.docId,
            kind: tab,
            content: res.content,
            model: res.model,
            createdAt: new Date().toISOString(),
          },
          ...v,
        ]);
        setDraft(res.content);
        setInstruction("");
      } else {
        setError(res.error);
      }
    });
  }

  // Open the real apply page and arm the Chrome extension with the current
  // drafts (unsaved edits are snapshotted server-side). window.open must run
  // synchronously in the click so popup blockers allow it.
  function applyWithTailored() {
    if (!jobUrl) return;
    window.open(jobUrl, "_blank", "noopener,noreferrer");
    setError(null);
    startTransition(async () => {
      const res = await handoffToExtension(
        applicationId,
        drafts.resume,
        drafts.cover_letter
      );
      if (res.ok) {
        setHandedOff(true);
      } else {
        setError(res.error);
      }
    });
  }

  function saveVersion() {
    if (!dirty || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await saveDocumentVersion(applicationId, tab, draft);
      if (res.ok) {
        setVersions((v) => [
          {
            id: res.docId,
            kind: tab,
            content: draft,
            model: "manual",
            createdAt: new Date().toISOString(),
          },
          ...v,
        ]);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-neutral-50 py-3">
        <div className="flex items-center gap-5">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-2 py-1 font-mono text-[11px] tracking-[0.18em] ${
                tab === k
                  ? "bg-neutral-50 text-neutral-950"
                  : "text-neutral-500 hover-invert"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {aiEnabled && hasResume && (
            <button
              type="button"
              onClick={() => generateBoth("redo")}
              disabled={isPending}
              title="Regenerate the résumé and cover letter from scratch — current drafts stay in version history"
              className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert disabled:opacity-40"
            >
              ↺ REDO BOTH
            </button>
          )}
          {latest && (
            <Link
              href={`/documents/${latest.id}`}
              target="_blank"
              className="font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert"
            >
              PRINT / PDF ↗
            </Link>
          )}
          {jobUrl && (
            <button type="button" onClick={applyWithTailored} className={btnSolid}>
              APPLY WITH TAILORED RÉSUMÉ ↗
            </button>
          )}
        </div>
      </div>

      {handedOff && (
        <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-400">
          [ SENT TO CHROME EXTENSION — AUTOFILL ON THE APPLY PAGE WILL USE THIS
          RÉSUMÉ + COVER LETTER ]
        </p>
      )}

      {!hasResume && (
        <Link
          href="/onboarding"
          className="block border border-neutral-50 bg-neutral-900 p-4 text-sm transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          <span className="font-mono text-[10px] tracking-[0.18em]">
            [ SETUP REQUIRED ]
          </span>{" "}
          Add your base résumé first — tailoring is built from it →
        </Link>
      )}
      {!aiEnabled && (
        <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
          [ SET CURSOR_API_KEY IN .ENV FOR FABLE 5 REVISIONS — MANUAL EDITING
          STILL WORKS ]
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={26}
            spellCheck={false}
            placeholder={
              tab === "cover_letter"
                ? "No cover letter draft yet — ask Fable below, or write one here."
                : "Draft your tailored résumé here…"
            }
            className="w-full border border-neutral-700 bg-neutral-900 px-4 py-3 font-mono text-xs leading-relaxed outline-none transition placeholder:text-neutral-500 focus:border-neutral-50"
          />

          <div className="space-y-3 border border-neutral-50 p-4">
            <MonoLabel>TELL FABLE WHAT TO CHANGE</MonoLabel>
            <form
              className="flex items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                revise();
              }}
            >
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder='e.g. "emphasize the AI ambassador work", "remove the Wooster section", "work SQL into skills honestly"'
                disabled={!aiEnabled || isPending}
                className="flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-neutral-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!aiEnabled || isPending || !instruction.trim()}
                className={btnSolid}
              >
                REVISE →
              </button>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={saveVersion}
                disabled={!dirty || isPending}
                className={btnOutline}
              >
                SAVE VERSION
              </button>
              {dirty && !isPending && (
                <span className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
                  UNSAVED EDITS
                </span>
              )}
            </div>
            {status && (
              <p className="animate-pulse font-mono text-[10px] tracking-[0.18em] text-neutral-400">
                [ {status} ]
              </p>
            )}
            {error && <p className="text-sm text-neutral-300">{error}</p>}
          </div>
        </div>

        <div className="space-y-8">
          <section className="space-y-3 border border-neutral-50 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <MonoLabel>KEYWORD COVERAGE</MonoLabel>
              <span className="font-mono text-[11px] tracking-[0.14em]">
                {hitCount}/{keywords.length}
              </span>
            </div>
            <div className="h-px w-full bg-neutral-800">
              <div
                className="h-px bg-neutral-50 transition-all"
                style={{
                  width: `${keywords.length ? (hitCount / keywords.length) * 100 : 0}%`,
                }}
              />
            </div>
            <ul className="space-y-1 pt-1">
              {coverage.map(({ term, hit }) => (
                <li
                  key={term}
                  className={`flex items-baseline justify-between gap-3 font-mono text-[11px] tracking-[0.1em] ${
                    hit ? "text-neutral-50" : "text-neutral-500"
                  }`}
                >
                  <span>{term.toUpperCase()}</span>
                  <span>{hit ? "✓" : "—"}</span>
                </li>
              ))}
            </ul>
            <p className="pt-1 text-xs leading-relaxed text-neutral-500">
              Updates live as the draft changes. Only claim what&apos;s honestly
              yours — coverage is a guide, not a target.
            </p>
          </section>

          <section className="space-y-3">
            <MonoLabel>VERSIONS — {KIND_LABEL[tab]}</MonoLabel>
            {tabVersions.length === 0 ? (
              <p className="text-sm text-neutral-500">No versions saved yet.</p>
            ) : (
              <ol className="border-t border-neutral-800">
                {tabVersions.map((v, i) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 border-b border-neutral-800 py-2"
                  >
                    <span className="font-mono text-[10px] tracking-[0.16em] text-neutral-500">
                      [ V{tabVersions.length - i} ]{" "}
                      {(v.model === "manual" ? "MANUAL" : "FABLE").padEnd(6)} ·{" "}
                      {new Date(v.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDraft(v.content)}
                      disabled={draft === v.content}
                      className="font-mono text-[10px] tracking-[0.14em] text-neutral-500 hover-invert disabled:opacity-30"
                    >
                      {draft === v.content ? "CURRENT" : "LOAD"}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
