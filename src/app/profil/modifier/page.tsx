import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "./edit-profile-form";

type ProfileRow = {
  pseudo: string | null;
  school_id: string | null;
  is_external: boolean;
  annee: string | null;
};

export default async function ModifierProfilPage() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo, school_id, is_external, annee")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (!profile?.pseudo) {
    redirect("/inscription");
  }

  const { data: schools } = await supabase
    .from("schools")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Modifier mon profil" />
      <EditProfileForm
        schools={schools ?? []}
        selfId={user.id}
        initial={{
          pseudo: profile.pseudo,
          schoolId: profile.school_id,
          isExternal: profile.is_external,
          annee: profile.annee,
        }}
      />
    </div>
  );
}
