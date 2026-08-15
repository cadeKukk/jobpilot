"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DOC_STYLES, type DocStyleId } from "@/components/document-render";
import { saveDocStyle } from "@/lib/doc-style-actions";

// Style guide switcher on the document preview. Selecting a style updates
// the preview immediately and persists it as the default for every future
// document and PDF download.
export function StylePicker({ current }: { current: DocStyleId }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">
        STYLE
      </span>
      {(Object.keys(DOC_STYLES) as DocStyleId[]).map((id) => (
        <button
          key={id}
          type="button"
          title={DOC_STYLES[id].description}
          onClick={() => {
            startTransition(async () => {
              await saveDocStyle(id);
              router.replace(`?style=${id}`);
            });
          }}
          className={`px-2 py-1 font-mono text-[10px] tracking-[0.14em] ${
            current === id
              ? "bg-neutral-50 text-neutral-950"
              : "text-neutral-500 hover-invert"
          }`}
        >
          {DOC_STYLES[id].label}
        </button>
      ))}
    </div>
  );
}
