export default function Loading() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-1 h-40 animate-pulse rounded-2xl bg-slate-100" />

      {/* Onglets format */}
      <div className="flex border-b border-slate-200">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-1 justify-center py-2.5">
            <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Carte Elo */}
      <div className="mt-6 h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />

      {/* Titre statistiques */}
      <div className="mt-6 mb-2 ml-2 h-3 w-24 animate-pulse rounded bg-slate-100" />

      {/* Onglets période */}
      <div className="flex border-b border-slate-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-1 justify-center py-2.5">
            <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Bloc stats */}
      <div className="mt-3 h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />

      {/* Historique */}
      <div className="mt-6 mb-2 ml-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-white" />
          </li>
        ))}
      </ul>
    </div>
  );
}
