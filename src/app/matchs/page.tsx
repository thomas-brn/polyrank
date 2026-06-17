import { ComingSoon, PageHeader } from "@/components/page-header";

export default function MatchsPage() {
  return (
    <div>
      <PageHeader
        title="Matchs"
        subtitle="Historique des matchs, filtrable par sport, date ou joueur."
      />
      <ComingSoon>
        La liste des matchs et le flux de validation / contestation arrivent en
        Phase 3.
      </ComingSoon>
    </div>
  );
}
