// Instant skeleton for the jobs feed — mirrors the real layout (section mark,
// title, filter bar, posting rows) so the swap to live content is seamless.
export default function JobsLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy>
      <div className="space-y-3">
        <div className="h-3 w-48 bg-neutral-900" />
        <div className="h-8 w-48 bg-neutral-900" />
        <div className="h-4 w-80 max-w-full bg-neutral-900" />
      </div>
      <div className="flex items-center gap-5 border-y border-neutral-50/40 py-3">
        {["w-28", "w-24", "w-16", "w-16", "w-20"].map((w, i) => (
          <div key={i} className={`h-3 ${w} bg-neutral-900`} />
        ))}
      </div>
      <div className="h-10 w-full max-w-xl bg-neutral-900" />
      <div className="space-y-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2 border border-neutral-800 p-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-64 max-w-full bg-neutral-900" />
              <div className="h-6 w-14 bg-neutral-900" />
            </div>
            <div className="h-3 w-48 bg-neutral-900" />
            <div className="h-3 w-full bg-neutral-900" />
            <div className="h-3 w-2/3 bg-neutral-900" />
          </div>
        ))}
      </div>
    </div>
  );
}
