const PALETTE = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
];

// Deterministic initials avatar so each company gets a stable color.
export function CompanyAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tone = PALETTE[hash % PALETTE.length];
  const sizeClass =
    size === "lg" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm";

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl font-bold ${tone} ${sizeClass}`}
    >
      {initials || "?"}
    </span>
  );
}
