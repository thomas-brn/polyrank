"use server";

import { redirect } from "next/navigation";

import { ANNEE_VALUES, EXTERNAL_VALUE } from "@/lib/constants";
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
  const ecole = String(formData.get("ecole") ?? ""); // uuid d'école OU "EXTE"
  const annee = String(formData.get("annee") ?? "");
  const isAdult = formData.get("is_adult") === "on";

  if (pseudo.length < 2) {
    return { error: "Choisis un pseudo (2 caractères minimum)." };
  }
  if (!ecole) {
    return { error: "Choisis ton école (ou « Exté »)." };
  }
  if (!isAdult) {
    return { error: "Tu dois confirmer avoir plus de 18 ans." };
  }

  const isExternal = ecole === EXTERNAL_VALUE;
  let schoolId: string | null = null;
  let anneeVal: string | null = null;

  if (!isExternal) {
    schoolId = ecole;
    if (!ANNEE_VALUES.includes(annee)) {
      return { error: "Choisis ton année." };
    }
    anneeVal = annee;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      pseudo,
      school_id: schoolId,
      is_external: isExternal,
      annee: anneeVal,
      is_adult: true,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect("/profil");
}
