import { ComingSoon, PageHeader } from "@/components/page-header";

export default function ClassementPage() {
  return (
    <div>
      <PageHeader
        title="Classement"
        subtitle="Le top par sport, filtrable par promo."
      />
      <ComingSoon>
        Le calcul du classement (points ou Elo) est défini en Phase 4. Cette page
        affichera bientôt le leaderboard avec filtres par sport et par promo.
      </ComingSoon>
    </div>
  );
}
