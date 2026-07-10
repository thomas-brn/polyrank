"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function acceptContest(matchId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("accept_contest", {
    p_match_id: matchId,
  });

  if (error) {
    // On redirige quand même vers la page du match — l'erreur sera visible via le statut
    redirect(`/matchs/${matchId}`);
  }

  // La correction a changé le résultat : recalcul des classements.
  await supabase.rpc("recompute_ratings");

  redirect(`/matchs/${matchId}`);
}

export async function refuseContest(matchId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("refuse_contest", {
    p_match_id: matchId,
  });

  if (!error) {
    // Match supprimé : recalcul des classements.
    await supabase.rpc("recompute_ratings");
  }

  redirect("/matchs");
}

// --- Arbitrage admin (matchs EN_APPEL) ---

export async function approveDeletion(matchId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("approve_deletion", {
    p_match_id: matchId,
  });

  if (error) {
    redirect(`/matchs/${matchId}`);
  }

  // Le match disparaît de l'historique : recalcul des classements.
  await supabase.rpc("recompute_ratings");

  redirect("/admin");
}

export async function rejectDeletion(matchId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.rpc("reject_deletion", { p_match_id: matchId });

  redirect(`/matchs/${matchId}`);
}
