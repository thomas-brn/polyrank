import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";
import { ANNEE_LABELS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  pseudo: string | null;
  annee: string | null;
  is_external: boolean;
  is_admin: boolean;
  schools: { name: string } | null;
};

export default async function ProfilPage() {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Mon profil" />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Authentification non configurée (voir le README).
        </div>
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
          <p className="text-sm text-slate-600">Tu n&apos;es pas connecté.</p>
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo, annee, is_external, is_admin, schools(name)")
    .eq("id", user.id)
    .single<ProfileRow>();

  // Profil pas encore complété → onboarding.
  if (!profile?.pseudo) {
    return (
      <div>
        <PageHeader title="Mon profil" subtitle={user.email ?? undefined} />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            Ton profil n&apos;est pas encore complet.
          </p>
          <Link
            href="/inscription"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Compléter mon profil
          </Link>
        </div>
      </div>
    );
  }

  const ecoleLabel = profile.is_external
    ? "Exté"
    : (profile.schools?.name ?? "—");
  const anneeLabel = profile.annee ? ANNEE_LABELS[profile.annee] : null;

  return (
    <div>
      <PageHeader title={profile.pseudo} subtitle={user.email ?? undefined} />

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-sm">
        <div className="bg-white p-4">
          <dt className="text-xs text-slate-500">École</dt>
          <dd className="mt-1 font-medium">{ecoleLabel}</dd>
        </div>
        <div className="bg-white p-4">
          <dt className="text-xs text-slate-500">Année</dt>
          <dd className="mt-1 font-medium">{anneeLabel ?? "—"}</dd>
        </div>
        <div className="bg-white p-4">
          <dt className="text-xs text-slate-500">Rôle</dt>
          <dd className="mt-1 font-medium">
            {profile.is_admin ? "Admin" : "Joueur"}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
