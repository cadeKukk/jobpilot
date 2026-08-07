// Circular match-score gauge (Jobright-style). Server-renderable SVG.
export function matchTier(pct: number) {
  if (pct >= 75) return { label: "STRONG MATCH", color: "#059669" };
  if (pct >= 55) return { label: "GOOD MATCH", color: "#10b981" };
  if (pct >= 35) return { label: "FAIR MATCH", color: "#f59e0b" };
  return { label: "LOW MATCH", color: "#94a3b8" };
}

export function MatchRing({
  pct,
  size = 64,
  showLabel = true,
}: {
  pct: number;
  size?: number;
  showLabel?: boolean;
}) {
  const stroke = size >= 80 ? 7 : 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const tier = matchTier(pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tier.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-bold text-slate-800"
          style={{ fontSize: size / 3.6 }}
        >
          {pct}%
        </span>
      </div>
      {showLabel && (
        <span
          className="text-[10px] font-bold tracking-wide"
          style={{ color: tier.color }}
        >
          {tier.label}
        </span>
      )}
    </div>
  );
}
