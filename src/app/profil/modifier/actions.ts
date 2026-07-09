"use server";

import { redirect } from "next/navigation";

import { ANNEE_VALUES, EXTE_SLUG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type EditState = { error?: string };

export async function updateProfile(
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  const ecole = String(formData.get("ecole") ?? "");
  const annee = String(formData.get("annee") ?? "");

  if (pseudo.length < 2) return { error: "Pseudo trop court (2 caractères minimum)." };
  if (pseudo.length > 15) return { error: "Pseudo trop long (15 caractères maximum)." };
  if (!/^[a-zA-Z0-9À-ɏ_-]+$/.test(pseudo)) {
    return { error: "Le pseudo ne peut contenir que des lettres, chiffres, - et _." };
  }
  if (!ecole) return { error: "Choisis ton école." };

  const { data: school } = await supabase
    .from("schools")
    .select("slug")
    .eq("id", ecole)
    .single<{ slug: string }>();

  const isExte = school?.slug === EXTE_SLUG;
  let anneeVal: string | null = null;
  if (!isExte) {
    if (!ANNEE_VALUES.includes(annee)) return { error: "Choisis ton année." };
    anneeVal = annee;
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("pseudo, pseudo_changed_at")
    .eq("id", user.id)
    .single<{ pseudo: string | null; pseudo_changed_at: string | null }>();

  const pseudoChanged =
    (current?.pseudo ?? "").toLowerCase() !== pseudo.toLowerCase();

  const update: Record<string, unknown> = {
    school_id: ecole,
    annee: anneeVal,
  };

  if (pseudoChanged) {
    if (current?.pseudo_changed_at) {
      const nextAllowed = new Date(current.pseudo_changed_at);
      nextAllowed.setMonth(nextAllowed.getMonth() + 1);
      if (nextAllowed > new Date()) {
        return {
          error: `Tu pourras changer de pseudo à partir du ${nextAllowed.toLocaleDateString("fr-FR")}.`,
        };
      }
    }
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .ilike("pseudo", pseudo)
      .neq("id", user.id)
      .limit(1);
    if (taken && taken.length > 0) return { error: "Ce pseudo est déjà pris." };

    update.pseudo = pseudo;
    update.pseudo_changed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) return { error: error.message };

  if (pseudoChanged && current?.pseudo) {
    await supabase
      .from("pseudo_history")
      .insert({ profile_id: user.id, pseudo: current.pseudo });
  }

  redirect("/profil");
}
