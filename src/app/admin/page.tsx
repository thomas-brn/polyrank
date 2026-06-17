import { ComingSoon, PageHeader } from "@/components/page-header";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle="Gestion des comptes et arbitrage des matchs litigieux."
      />
      <ComingSoon>
        Le back-office admin (gérer les comptes, trancher les matchs contestés)
        est développé en Phase 5. L&apos;accès sera réservé aux profils
        <code className="mx-1 rounded bg-slate-100 px-1">is_admin</code>.
      </ComingSoon>
    </div>
  );
}
