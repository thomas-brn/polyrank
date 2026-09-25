import { ComingSoon } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { getMode, MODES } from "@/lib/mode";

export default async function NouveauTournoiPage() {
  const mode = await getMode();
  const sport = MODES[mode].sport;

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        title="Créer un tournoi"
        description={`Organise un tournoi ${sport} entre joueurs inscrits.`}
      />

      <ComingSoon>
        Fonctionnalité en préparation : format du tournoi, inscription des
        joueurs et arbre des matchs.
      </ComingSoon>
    </div>
  );
}
