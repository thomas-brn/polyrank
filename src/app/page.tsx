import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { PlayerSearch } from "@/components/player-search";
import { RulesOverlay } from "@/components/rules-overlay";
import { getMode, MODES } from "@/lib/mode";

export default async function HomePage() {
  const mode = await getMode();
  const sport = MODES[mode].sport;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-accent p-8 pb-4 text-white md:flex-row md:items-center md:justify-between md:gap-6 md:pb-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">
            Poly<span className="text-brand-100">Rank</span>
          </h1>
          <p className="mt-2 max-w-md text-brand-50">
            Saisis tes résultats de matchs {sport} et grimpe dans les
            classements, par école et par promo.
          </p>
        </div>
        <ModeToggle current={mode} />
      </section>

      <PlayerSearch />

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/classement"
          className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
        >
          <h2 className="font-semibold">Classement {sport}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Le top des joueurs, filtrable par école.
          </p>
        </Link>
        <Link
          href="/matchs"
          className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
        >
          <h2 className="font-semibold">Historique {sport}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tous les matchs joués, litiges en attente ou contestations.
          </p>
        </Link>
        <RulesOverlay mode={mode} />
      </section>
    </div>
  );
}
