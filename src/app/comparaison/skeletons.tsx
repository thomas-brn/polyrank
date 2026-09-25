/**
 * Squelettes de la page de comparaison. Partagés entre `loading.tsx` (chargement
 * de la route) et les boundaries Suspense de la page (changement de joueur, de
 * format ou de période) : les blocs gardent la place et la forme du contenu
 * final, donc la mise en page ne saute pas quand les données arrivent.
 */

function Line({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

export function SectionTitleSkeleton({ width }: { width: string }) {
  return <Line className={`mt-2 ml-2 h-3 ${width}`} />;
}

export function PickerSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
      <div className="h-13 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="flex h-13 w-5 items-center justify-center">
        <Line className="size-4" />
      </div>
      <div className="h-13 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <>
      <div className="flex border-b border-slate-200">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-1 justify-center py-2.5">
            <Line className="h-4 w-12" />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Line key={i} className="h-7 w-14 rounded-full" />
        ))}
      </div>
    </>
  );
}

export function EloSkeleton() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <Line className="mx-auto mb-3 h-3 w-20" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <EloSideSkeleton align="start" />
        <Line className="mt-8 h-5 w-10 rounded-full" />
        <EloSideSkeleton align="end" />
      </div>
    </section>
  );
}

function EloSideSkeleton({ align }: { align: "start" | "end" }) {
  return (
    <div
      className={`flex flex-col gap-1.5 ${align === "start" ? "items-start" : "items-end"}`}
    >
      <Line className="h-3.5 w-20" />
      <Line className="h-2.5 w-24" />
      <Line className="mt-0.5 h-7 w-16" />
      <Line className="h-2.5 w-14" />
    </div>
  );
}

export function EloChartSkeleton() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <Line className="mb-2 h-3 w-24" />
      <Line className="h-28 w-full" />
    </section>
  );
}

export function StatsSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitleSkeleton width="w-24" />

      <div className="rounded-xl border border-slate-200 bg-white p-3 py-6">
        <div className="mx-auto aspect-square w-44 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 flex justify-center gap-4">
          <Line className="h-2.5 w-16" />
          <Line className="h-2.5 w-16" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Line className="h-3 w-20" />
          <Line className="h-2.5 w-4" />
          <Line className="h-3 w-20 justify-self-end" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-50 px-3 py-2.5 last:border-b-0"
          >
            <Line className="h-3.5 w-10" />
            <Line className="h-2.5 w-24" />
            <Line className="h-3.5 w-10 justify-self-end" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HeadToHeadSkeleton({ matches = 3 }: { matches?: number }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitleSkeleton width="w-28" />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-center gap-3">
          <Line className="h-8 w-10" />
          <Line className="h-5 w-2" />
          <Line className="h-8 w-10" />
        </div>
        <Line className="mx-auto mt-2 h-2.5 w-32" />
      </div>

      <ul className="flex flex-col gap-3">
        {Array.from({ length: matches }).map((_, i) => (
          <li key={i}>
            <div className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-white" />
          </li>
        ))}
      </ul>
    </section>
  );
}
