export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex border-b border-slate-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-1 justify-center py-2.5">
              <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-7 w-32 animate-pulse rounded-md bg-slate-100" />
        <div className="h-7 w-28 animate-pulse rounded-md bg-slate-100" />
      </div>

      <ol className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i}>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="h-5 w-7 shrink-0 animate-pulse rounded bg-slate-100" />
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" />
                <div className="mt-1.5 h-2.5 w-20 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-5 w-10 shrink-0 animate-pulse rounded bg-slate-100" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
