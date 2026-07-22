export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="mb-4 h-40 animate-pulse rounded-2xl bg-slate-100 md:h-32" />

      {/* Recherche joueur */}
      <div className="h-11 animate-pulse rounded-xl bg-slate-100" />

      {/* Stats */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 pt-4">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-50" />
          ))}
        </div>
      </div>

      {/* Deux cartes */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
