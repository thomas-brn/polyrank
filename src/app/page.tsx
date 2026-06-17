import Link from "next/link";
import { PlusCircle, Trophy } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-white">
        <h1 className="text-3xl font-bold tracking-tight">
          Poly<span className="text-blue-100">Rank</span>
        </h1>
        <p className="mt-2 max-w-md text-blue-50">
          Saisis tes résultats de matchs et grimpe dans les classements de ton
          école, par sport et par promo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/matchs/nouveau"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            <PlusCircle className="size-4" aria-hidden />
            Saisir un match
          </Link>
          <Link
            href="/classement"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500/30 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-blue-500/50"
          >
            <Trophy className="size-4" aria-hidden />
            Voir le classement
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/classement"
          className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
        >
          <h2 className="font-semibold">Classements</h2>
          <p className="mt-1 text-sm text-slate-500">
            Le top par sport, filtrable par promo.
          </p>
        </Link>
        <Link
          href="/matchs"
          className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
        >
          <h2 className="font-semibold">Historique des matchs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tous les matchs joués, à valider ou contester.
          </p>
        </Link>
      </section>
    </div>
  );
}
