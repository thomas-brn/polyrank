import { ComingSoon, PageHeader } from "@/components/page-header";

export default function NouveauMatchPage() {
  return (
    <div>
      <PageHeader
        title="Saisir un match"
        subtitle="Jeu (FifaChamp / CoinCoin), format 1v1·2v2, adversaires, vainqueur (+ score pour FifaChamp)."
      />
      <ComingSoon>
        Le formulaire de saisie (réservé aux élèves connectés) est développé en
        Phase 3.
      </ComingSoon>
    </div>
  );
}
