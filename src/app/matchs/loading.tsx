export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex border-b border-slate-200">
          {Array.from({ length: 3 }).map((_, i) => (
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

      <ul className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-white" />
          </li>
        ))}
      </ul>
    </div>
  );
}
