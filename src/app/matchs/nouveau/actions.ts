"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type NewMatchState = { error?: string };

const MAX_PER_SIDE = 4;

type ParticipantInsert = {
  match_id: string;
  side: "A" | "B";
  profile_id: string | null;
  guest_name: string | null;
  is_creator: boolean;
};

export async function createMatch(
  _prev: NewMatchState,
  formData: FormData,
): Promise<NewMatchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const gameId = String(formData.get("game_id") ?? "");
  const winnerInput = String(formData.get("winner") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;

  const mates = formData
    .getAll("mate")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const opps = formData
    .getAll("opp")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!gameId) return { error: "Choisis un jeu." };
  if (opps.length < 1) return { error: "Indique au moins un adversaire." };
  if (opps.length > MAX_PER_SIDE) return { error: "4 adversaires maximum." };
  if (mates.length > MAX_PER_SIDE - 1) {
    return { error: "4 joueurs maximum dans ton équipe." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("id, has_score")
    .eq("id", gameId)
    .single<{ id: string; has_score: boolean }>();

  if (!game) return { error: "Jeu introuvable." };

  const format = `${1 + mates.length}V${opps.length}`;

  let winner: "A" | "B" | "NUL";
  let scoreA: number | null = null;
  let scoreB: number | null = null;

  if (game.has_score) {
    scoreA = Number(formData.get("score_a"));
    scoreB = Number(formData.get("score_b"));
    if (
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0
    ) {
      return { error: "Saisis un score valide." };
    }
    winner = scoreA > scoreB ? "A" : scoreA < scoreB ? "B" : "NUL";
  } else {
    if (winnerInput !== "A" && winnerInput !== "B") {
      return { error: "Indique qui a gagné." };
    }
    winner = winnerInput;
  }

  // Résout un nom en profil tagué (pseudo exact, insensible à la casse) ou en invité.
  async function resolve(
    name: string,
  ): Promise<{ profile_id: string | null; guest_name: string | null }> {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("pseudo", name)
      .limit(2);
    if (data && data.length === 1) {
      return { profile_id: data[0].id as string, guest_name: null };
    }
    return { profile_id: null, guest_name: name };
  }

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .insert({
      game_id: gameId,
      created_by: user.id,
      format,
      winner_side: winner,
      score_a: scoreA,
      score_b: scoreB,
      location,
    })
    .select("id")
    .single<{ id: string }>();

  if (matchErr || !match) {
    return { error: matchErr?.message ?? "Échec de la création du match." };
  }

  // is_creator est posé explicitement sur CHAQUE participant : sinon PostgREST
  // envoie NULL pour les objets où la clé manque (violation NOT NULL).
  const participants: ParticipantInsert[] = [
    {
      match_id: match.id,
      side: "A",
      profile_id: user.id,
      guest_name: null,
      is_creator: true,
    },
  ];
  for (const name of mates) {
    participants.push({
      match_id: match.id,
      side: "A",
      ...(await resolve(name)),
      is_creator: false,
    });
  }
  for (const name of opps) {
    participants.push({
      match_id: match.id,
      side: "B",
      ...(await resolve(name)),
      is_creator: false,
    });
  }

  const { error: partErr } = await supabase
    .from("match_participants")
    .insert(participants);
  if (partErr) return { error: partErr.message };

  await supabase.from("match_events").insert({
    match_id: match.id,
    actor_id: user.id,
    type: "SOUMISSION",
  });

  redirect("/matchs");
}
