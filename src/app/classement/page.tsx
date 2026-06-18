import { ComingSoon, PageHeader } from "@/components/page-header";
import { PlayerSearch } from "@/components/player-search";

export default function ClassementPage() {
  return (
    <div>
      <PageHeader
        title="Classement"
        subtitle="Le top par jeu, filtrable par école."
      />

      <div className="mb-6">
        <PlayerSearch />
      </div>

      <ComingSoon>
        Le calcul du classement (points ou Elo) est défini en Phase 4. Cette page
        affichera bientôt le leaderboard avec filtres par jeu et par école.
      </ComingSoon>
    </div>
  );
}
