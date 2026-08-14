// Shared editorial primitives, matching cadekukk.vercel.app: bracketed
// section markers, uppercase mono labels, hairline rules.

export function SectionMark({ text }: { text: string }) {
  return (
    <p className="font-mono text-[10px] tracking-[0.22em] text-neutral-400">
      [ {text.toUpperCase()} ]
    </p>
  );
}

export function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
      {children}
    </span>
  );
}

// Button/input class recipes.
export const btnSolid =
  "inline-flex items-center gap-2 border border-neutral-950 bg-neutral-950 px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-white transition hover:bg-neutral-700 disabled:opacity-40";

export const btnOutline =
  "inline-flex items-center gap-2 border border-neutral-950 bg-transparent px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-neutral-950 transition hover:bg-neutral-950 hover:text-white disabled:opacity-40";

export const btnGhost =
  "inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-neutral-400 transition hover:text-neutral-950 disabled:opacity-40";

export const inputBase =
  "w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

export const textareaBase =
  "w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";
