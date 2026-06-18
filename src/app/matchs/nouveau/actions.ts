"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type NewMatchState = { error?: string };

const MAX_PER_SIDE = 4;

type Player = { name: string; profileId: string | null };

type ParticipantInsert = {
  match_id: string;
  side: "A" | "B";
  profile_id: string | null;
  guest_name: string | null;
  is_creator: boolean;
};

function cleanPlayers(raw: unknown): Player[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({
      name:
        p && typeof (p as Player).name === "string"
          ? (p as Player).name.replace(/^@/, "").trim()
          : "",
      profileId:
        p && typeof (p as Player).profileId === "string"
          ? (p as Player).profileId
          : null,
    }))
    .filter((p) => p.name.length > 0);
}

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

  let parsed: { mates?: unknown; opps?: unknown } = {};
  try {
    parsed = JSON.parse(String(formData.get("players") ?? "{}"));
  } catch {
    return { error: "Données du formulaire invalides." };
  }
  const mates = cleanPlayers(parsed.mates).slice(0, MAX_PER_SIDE - 1);
  const opps = cleanPlayers(parsed.opps).slice(0, MAX_PER_SIDE);

  if (!gameId) return { error: "Choisis un jeu." };
  if (opps.length < 1) return { error: "Indique au moins un adversaire." };

  if (opps.some((o) => o.profileId === user.id)) {
    return { error: "Tu ne peux pas être ton propre adversaire." };
  }

  // Au moins un adversaire doit avoir un compte (taggé) : lui seul peut valider.
  if (!opps.some((o) => o.profileId)) {
    return {
      error:
        "Au moins un adversaire doit avoir un compte (taggé avec @) pour pouvoir valider le match.",
    };
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

  // Un joueur taggé -> profile_id ; sinon -> guest_name. is_creator posé partout.
  const toParticipant = (side: "A" | "B", p: Player): ParticipantInsert => ({
    match_id: match.id,
    side,
    profile_id: p.profileId,
    guest_name: p.profileId ? null : p.name,
    is_creator: false,
  });

  const participants: ParticipantInsert[] = [
    {
      match_id: match.id,
      side: "A",
      profile_id: user.id,
      guest_name: null,
      is_creator: true,
    },
    ...mates.map((p) => toParticipant("A", p)),
    ...opps.map((p) => toParticipant("B", p)),
  ];

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
