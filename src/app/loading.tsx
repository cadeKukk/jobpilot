// Route-level loading state: shown instantly on navigation while the page's
// server render (DB reads) completes. Keeps the header/nav interactive and
// gives immediate feedback instead of freezing on the previous page.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy>
      <div className="space-y-3">
        <div className="h-3 w-44 bg-neutral-900" />
        <div className="h-8 w-64 bg-neutral-900" />
        <div className="h-4 w-96 max-w-full bg-neutral-900" />
      </div>
      <div className="h-10 border-y border-neutral-50/40" />
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 border border-neutral-800 p-5">
            <div className="h-4 w-72 max-w-full bg-neutral-900" />
            <div className="h-3 w-52 bg-neutral-900" />
            <div className="h-3 w-full bg-neutral-900" />
          </div>
        ))}
      </div>
    </div>
  );
}
