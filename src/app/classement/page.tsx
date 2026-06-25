import { ComingSoon } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { PlayerSearch } from "@/components/player-search";
import { getMode, MODES } from "@/lib/mode";

export default async function ClassementPage() {
  const sport = MODES[await getMode()].sport;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={`Classement ${sport}`}
        description={`Le top des joueurs ${sport}, filtrable par école.`}
      />

      <div>
        <PlayerSearch />
      </div>

      <ComingSoon>
        Le calcul du classement (points ou Elo) est défini en Phase 4. Cette page
        affichera bientôt le leaderboard {sport} avec filtres par école.
      </ComingSoon>
    </div>
  );
}
