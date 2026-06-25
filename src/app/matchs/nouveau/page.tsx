import { redirect } from "next/navigation";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { getMode, MODES } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { NewMatchForm } from "./new-match-form";

export default async function NouveauMatchPage() {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Saisir un match" />
        <ComingSoon>Authentification non configurée (voir le README).</ComingSoon>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo")
    .eq("id", user.id)
    .single<{ pseudo: string | null }>();

  if (!profile?.pseudo) {
    redirect("/inscription");
  }

  // Le match est saisi pour le sport actif : on ne propose que ce jeu.
  const mode = await getMode();
  const sport = MODES[mode].sport;
  const { data: games } = await supabase
    .from("games")
    .select("id, name, has_score")
    .eq("is_active", true)
    .eq("slug", mode)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={`Saisir un match ${sport}`}
        description="Résultat rapide. La validation par l'adversaire viendra ensuite."
      />
      <NewMatchForm games={games ?? []} myPseudo={profile.pseudo} myId={user.id} />
    </div>
  );
}
