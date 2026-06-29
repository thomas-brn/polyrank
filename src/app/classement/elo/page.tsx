import Link from "next/link";

import { CoinCoinElo } from "@/components/elo/coincoin-elo";
import { FifaChampElo } from "@/components/elo/fifachamp-elo";
import { PageHero } from "@/components/page-hero";
import { getMode, MODES } from "@/lib/mode";

export default async function EloPage() {
  const mode = await getMode();
  const sport = MODES[mode].sport;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Comment fonctionne le classement ?"
        description={`Le système de points qui classe les joueurs ${sport}.`}
      >
        <Link
          href="/classement"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/30"
        >
          Retour au classement
        </Link>
      </PageHero>

      <div className="pb-4">
        {mode === "fifachamp" ? <FifaChampElo /> : <CoinCoinElo />}
      </div>
    </div>
  );
}
