import { ComingSoon, PageHeader } from "@/components/page-header";

export default function NouveauMatchPage() {
  return (
    <div>
      <PageHeader
        title="Saisir un match"
        subtitle="Sport, adversaires, score, lieu — adapté selon le sport."
      />
      <ComingSoon>
        Le formulaire de saisie (réservé aux élèves connectés) est développé en
        Phase 3.
      </ComingSoon>
    </div>
  );
}
