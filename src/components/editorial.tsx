// Shared editorial primitives, matching cadekukk.vercel.app: bracketed
// section markers, uppercase mono labels, hairline rules.

export function SectionMark({ text }: { text: string }) {
  return (
    <p className="font-mono text-[10px] tracking-[0.22em] text-neutral-500">
      [ {text.toUpperCase()} ]
    </p>
  );
}

export function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
      {children}
    </span>
  );
}

// Button/input class recipes.
export const btnSolid =
  "inline-flex items-center gap-2 border border-neutral-50 bg-neutral-50 px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-neutral-950 transition hover:bg-neutral-300 disabled:opacity-40";

export const btnOutline =
  "inline-flex items-center gap-2 border border-neutral-50 bg-transparent px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-neutral-50 transition hover:bg-neutral-50 hover:text-neutral-950 disabled:opacity-40";

export const btnGhost =
  "inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-neutral-500 hover-invert disabled:opacity-40";

export const inputBase =
  "w-full border-0 border-b border-neutral-700 bg-transparent px-0 py-2 text-sm outline-none transition placeholder:text-neutral-500 focus:border-neutral-50";

export const textareaBase =
  "w-full border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm leading-relaxed outline-none transition placeholder:text-neutral-500 focus:border-neutral-50";
