import { ComingSoon } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Administration"
        description="Gestion des comptes et arbitrage des matchs litigieux."
      />
      <ComingSoon>
        Le back-office admin (gérer les comptes, trancher les matchs contestés)
        est développé en Phase 5. L&apos;accès sera réservé aux profils
        <code className="mx-1 rounded bg-slate-100 px-1">is_admin</code>.
      </ComingSoon>
    </div>
  );
}
