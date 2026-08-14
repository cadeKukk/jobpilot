"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { btnSolid } from "@/components/editorial";
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
    <div className="flex h-[calc(100vh-22rem)] min-h-[26rem] flex-col border border-neutral-50 bg-neutral-900">
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col justify-center gap-6">
            <p className="font-mono text-[10px] tracking-[0.22em] text-neutral-500">
              [ NO MESSAGES — START WITH ONE OF THESE ]
            </p>
            <ul className="space-y-3">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    disabled={!aiEnabled}
                    className="hover-invert text-left text-sm text-neutral-400 disabled:opacity-40"
                  >
                    → {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="space-y-1.5">
            <p className="font-mono text-[10px] tracking-[0.22em] text-neutral-500">
              [ {m.role === "user" ? "YOU" : "PILOT"} ]
            </p>
            <p
              className={`max-w-2xl whitespace-pre-wrap text-sm leading-relaxed ${
                m.role === "user"
                  ? "font-medium text-neutral-50"
                  : "text-neutral-300"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}

        {isPending && (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] tracking-[0.22em] text-neutral-500">
              [ PILOT ]
            </p>
            <p className="animate-pulse text-sm text-neutral-500">
              Thinking with Fable 5…
            </p>
          </div>
        )}

        {error && (
          <p className="border border-neutral-50 p-3 text-sm text-neutral-300">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-3 border-t border-neutral-50 p-3"
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
              ? "Ask about interviews, fit, Estonia, career moves…"
              : "Set CURSOR_API_KEY in .env to chat with Pilot"
          }
          disabled={!aiEnabled || isPending}
          className="flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-neutral-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!aiEnabled || isPending || !input.trim()}
          className={btnSolid}
        >
          SEND →
        </button>
      </form>
    </div>
  );
}
