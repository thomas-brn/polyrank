import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { EXTE_SLUG } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function InscriptionPage() {
  if (!isSupabaseConfigured) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Déjà connecté avec un profil complet → profil
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .single();
    if (profile?.pseudo) {
      redirect("/profil");
    }
  }

  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, slug")
    .order("name");

  // Joueurs importés du Google Sheet Champish, sans compte, réclamables.
  const { data: legacyPlayers } = await supabase
    .from("profiles")
    .select("id, pseudo, school:schools(name, slug)")
    .eq("is_legacy", true)
    .not("pseudo", "is", null)
    .order("pseudo");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Inscription"
        subtitle="Crée ton compte pour rejoindre le classement et ne plus oublier tes parties !"
      />
      <OnboardingForm
        schools={schools ?? []}
        selfId={user?.id ?? null}
        isAuthenticated={!!user}
        legacyPlayers={(legacyPlayers ?? []).map((p) => {
          const school = Array.isArray(p.school)
            ? p.school[0]
            : (p.school as { name: string; slug: string } | null);
          return {
            id: p.id as string,
            pseudo: p.pseudo as string,
            ville: school?.name ?? null,
            isExte: school?.slug === EXTE_SLUG,
          };
        })}
      />
      {user && (
        <div className="mt-4 flex justify-center">
          <LogoutButton />
        </div>
      )}
    </div>
  );
}
