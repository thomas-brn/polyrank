"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type DeletionState = { error?: string };

export async function requestDeletion(
  _prev: DeletionState,
  formData: FormData,
): Promise<DeletionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const matchId = String(formData.get("match_id") ?? "");
  if (!matchId) return { error: "Match introuvable." };

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10) {
    return { error: "Explique en quelques mots pourquoi (au moins 10 caractères)." };
  }
  if (reason.length > 500) {
    return { error: "Motif trop long (500 caractères max)." };
  }

  const { error } = await supabase.rpc("request_deletion", {
    p_match_id: matchId,
    p_reason: reason,
  });

  if (error) return { error: error.message };

  redirect(`/matchs/${matchId}`);
}
