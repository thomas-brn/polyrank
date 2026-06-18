"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type NewMatchState = { error?: string };

const FORMATS = ["1V1", "2V2", "1V2"] as const;

type ParticipantInsert = {
  match_id: string;
  side: "A" | "B";
  profile_id: string | null;
  guest_name: string | null;
  is_creator?: boolean;
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
  const format = String(formData.get("format") ?? "");
  const winnerInput = String(formData.get("winner") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const mateName = String(formData.get("mate") ?? "").trim();
  const opp1 = String(formData.get("opp1") ?? "").trim();
  const opp2 = String(formData.get("opp2") ?? "").trim();

  if (!gameId) return { error: "Choisis un jeu." };
  if (!(FORMATS as readonly string[]).includes(format)) {
    return { error: "Choisis un format." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("id, has_score")
    .eq("id", gameId)
    .single<{ id: string; has_score: boolean }>();

  if (!game) return { error: "Jeu introuvable." };

  const needsTwoOpp = format === "2V2" || format === "1V2";
  const hasMate = format === "2V2";

  if (!opp1) return { error: "Indique au moins un adversaire." };
  if (needsTwoOpp && !opp2) return { error: "Indique le second adversaire." };
  if (hasMate && !mateName) return { error: "Indique ton coéquipier." };

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
  async function resolve(name: string) {
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

  const participants: ParticipantInsert[] = [
    { match_id: match.id, side: "A", profile_id: user.id, guest_name: null, is_creator: true },
  ];
  if (hasMate) {
    participants.push({ match_id: match.id, side: "A", ...(await resolve(mateName)) });
  }
  participants.push({ match_id: match.id, side: "B", ...(await resolve(opp1)) });
  if (needsTwoOpp) {
    participants.push({ match_id: match.id, side: "B", ...(await resolve(opp2)) });
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
