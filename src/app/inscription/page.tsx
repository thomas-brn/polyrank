import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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

  if (!user) {
    redirect("/login");
  }

  // Profil déjà complété ? → on file vers le profil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo")
    .eq("id", user.id)
    .single();

  if (profile?.pseudo) {
    redirect("/profil");
  }

  const { data: schools } = await supabase
    .from("schools")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Bienvenue 👋"
        subtitle="Complète ton profil pour commencer à jouer."
      />
      <OnboardingForm schools={schools ?? []} />
    </div>
  );
}
