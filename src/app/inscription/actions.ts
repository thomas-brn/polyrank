"use server";

import { redirect } from "next/navigation";

import { ANNEE_VALUES, EXTE_SLUG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

export async function completeProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  const ecole = String(formData.get("ecole") ?? ""); // uuid d'école
  const annee = String(formData.get("annee") ?? "");

  if (pseudo.length < 2) {
    return { error: "Choisis un pseudo (2 caractères minimum)." };
  }
  if (!/^[a-zA-Z0-9À-ɏ_-]+$/.test(pseudo)) {
    return { error: "Le pseudo ne peut contenir que des lettres, chiffres, - et _." };
  }
  if (!ecole) {
    return { error: "Choisis ton école." };
  }

  const { data: school } = await supabase
    .from("schools")
    .select("slug")
    .eq("id", ecole)
    .single<{ slug: string }>();

  const isExte = school?.slug === EXTE_SLUG;
  let anneeVal: string | null = null;

  if (!isExte) {
    if (!ANNEE_VALUES.includes(annee)) {
      return { error: "Choisis ton année." };
    }
    anneeVal = annee;
  }

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("pseudo", pseudo)
    .neq("id", user.id)
    .limit(1);
  if (taken && taken.length > 0) {
    return { error: "Ce pseudo est déjà pris." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ pseudo, school_id: ecole, annee: anneeVal })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect("/profil");
}
