"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Compass, SendHorizonal } from "lucide-react";
import { askPilot, type PilotMessage } from "@/lib/pilot-actions";

export function PilotChat({
  jobId,
  suggestions,
  aiEnabled,
}: {
  jobId?: string;
  suggestions: string[];
  aiEnabled: boolean;
}) {
  const [messages, setMessages] = useState<PilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function send(text: string) {
    const content = text.trim();
    if (!content || isPending) return;
    setError(null);
    setInput("");
    const history: PilotMessage[] = [...messages, { role: "user", content }];
    setMessages(history);
    startTransition(async () => {
      const res = await askPilot(history, jobId);
      if (res.reply) {
        setMessages([...history, { role: "assistant", content: res.reply }]);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-16rem)] min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Compass className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold">Ask Pilot anything</p>
              <p className="mt-1 text-sm text-slate-500">
                Career advice grounded in your resume
                {jobId ? " and this job posting" : ""}.
              </p>
            </div>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={!aiEnabled}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-emerald-600 px-4 py-2.5 text-sm text-white">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Compass className="h-4 w-4" />
              </span>
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed text-slate-700">
                {m.content}
              </p>
            </div>
          )
        )}

        {isPending && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Compass className="h-4 w-4 animate-pulse" />
            </span>
            <span className="text-sm text-slate-400">Pilot is thinking…</span>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-slate-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            aiEnabled
              ? "Ask about interviews, your fit, career moves…"
              : "Add an AI key to chat with Pilot (see README)"
          }
          disabled={!aiEnabled || isPending}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!aiEnabled || isPending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizonal className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
}
