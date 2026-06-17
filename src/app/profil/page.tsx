import Link from "next/link";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function ProfilPage() {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Mon profil" />
        <ComingSoon>
          Authentification non configurée. Renseigne tes clés Supabase dans
          <code className="mx-1 rounded bg-slate-100 px-1">.env.local</code>
          (voir le README) pour activer la connexion.
        </ComingSoon>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <PageHeader title="Mon profil" />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            Tu n&apos;es pas connecté.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Mon profil" subtitle={user.email ?? undefined} />
      <ComingSoon>
        L&apos;édition du profil (nom, promo, photo) et tes statistiques arrivent
        en Phase 2 et 4.
      </ComingSoon>
    </div>
  );
}
