"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type MatchState = { error?: string };

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

export async function updateMatch(
  _prev: MatchState,
  formData: FormData,
): Promise<MatchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const matchId = String(formData.get("match_id") ?? "");
  if (!matchId) return { error: "Match introuvable." };

  const { data: existing } = await supabase
    .from("matches")
    .select("id, created_by")
    .eq("id", matchId)
    .single<{ id: string; created_by: string }>();

  if (!existing) return { error: "Match introuvable." };
  if (existing.created_by !== user.id)
    return { error: "Tu n'es pas le créateur de ce match." };

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

  if (opps.some((o) => o.profileId === user.id))
    return { error: "Tu ne peux pas être ton propre adversaire." };

  if (!opps.some((o) => o.profileId))
    return {
      error:
        "Au moins un adversaire doit avoir un compte (taggé avec @) pour pouvoir valider le match.",
    };

  const identityKeys = [
    `id:${user.id}`,
    ...mates.map((p) =>
      p.profileId ? `id:${p.profileId}` : `name:${p.name.toLowerCase()}`,
    ),
    ...opps.map((p) =>
      p.profileId ? `id:${p.profileId}` : `name:${p.name.toLowerCase()}`,
    ),
  ];
  if (new Set(identityKeys).size !== identityKeys.length)
    return { error: "Un même joueur est ajouté plusieurs fois." };

  const { data: game } = await supabase
    .from("games")
    .select("id, has_score")
    .eq("id", gameId)
    .single<{ id: string; has_score: boolean }>();

  if (!game) return { error: "Jeu introuvable." };

  const format = `${1 + mates.length}V${opps.length}`;

  const readStat = (prefix: string, key: string) => {
    const val = Number(formData.get(`stats_${prefix}_${key}`));
    return Number.isFinite(val) && val >= 0 ? Math.floor(val) : 0;
  };

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
    )
      return { error: "Saisis un score valide." };
    // FifaChamp: forfait à 5 cartons rouges, puis score = buts + cartons rouges
    const crA = readStat("a", "cartons_rouges");
    const crB = readStat("b", "cartons_rouges");
    const forfaitA = crA >= 5;
    const forfaitB = crB >= 5;
    if (forfaitA && !forfaitB) {
      winner = "B";
    } else if (forfaitB && !forfaitA) {
      winner = "A";
    } else {
      const totalA = scoreA + crA;
      const totalB = scoreB + crB;
      if (totalA !== totalB) {
        winner = totalA > totalB ? "A" : "B";
      } else if (crA !== crB) {
        winner = crA > crB ? "A" : "B";
      } else {
        const cjA = readStat("a", "cartons_jaunes");
        const cjB = readStat("b", "cartons_jaunes");
        if (cjA !== cjB) {
          winner = cjA > cjB ? "A" : "B";
        } else {
          const fscA = readStat("a", "fautes_sans_carton");
          const fscB = readStat("b", "fautes_sans_carton");
          winner = fscA > fscB ? "A" : fscA < fscB ? "B" : "NUL";
        }
      }
    }
  } else {
    if (winnerInput !== "A" && winnerInput !== "B")
      return { error: "Indique qui a gagné." };
    winner = winnerInput;
  }

  const stats = game.has_score
    ? {
        a: {
          cartons_rouges: readStat("a", "cartons_rouges"),
          cartons_jaunes: readStat("a", "cartons_jaunes"),
          retournees: readStat("a", "retournees"),
          coups_francs: readStat("a", "coups_francs"),
          sorties_blessure: readStat("a", "sorties_blessure"),
          fautes_sans_carton: readStat("a", "fautes_sans_carton"),
        },
        b: {
          cartons_rouges: readStat("b", "cartons_rouges"),
          cartons_jaunes: readStat("b", "cartons_jaunes"),
          retournees: readStat("b", "retournees"),
          coups_francs: readStat("b", "coups_francs"),
          sorties_blessure: readStat("b", "sorties_blessure"),
          fautes_sans_carton: readStat("b", "fautes_sans_carton"),
        },
      }
    : null;

  const { error: updateErr } = await supabase
    .from("matches")
    .update({
      game_id: gameId,
      format,
      winner_side: winner,
      score_a: scoreA,
      score_b: scoreB,
      location,
      stats,
    })
    .eq("id", matchId);

  if (updateErr) return { error: updateErr.message };

  const { error: delErr } = await supabase
    .from("match_participants")
    .delete()
    .eq("match_id", matchId);

  if (delErr) return { error: delErr.message };

  const toParticipant = (side: "A" | "B", p: Player): ParticipantInsert => ({
    match_id: matchId,
    side,
    profile_id: p.profileId,
    guest_name: p.profileId ? null : p.name,
    is_creator: false,
  });

  const participants: ParticipantInsert[] = [
    { match_id: matchId, side: "A", profile_id: user.id, guest_name: null, is_creator: true },
    ...mates.map((p) => toParticipant("A", p)),
    ...opps.map((p) => toParticipant("B", p)),
  ];

  const { error: partErr } = await supabase
    .from("match_participants")
    .insert(participants);

  if (partErr) return { error: partErr.message };

  await supabase.from("match_events").insert({
    match_id: matchId,
    actor_id: user.id,
    type: "MODIFICATION",
  });

  redirect(`/matchs/${matchId}`);
}

export async function deleteMatch(matchId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("created_by")
    .eq("id", matchId)
    .single<{ created_by: string }>();

  if (!match || match.created_by !== user.id) {
    redirect(`/matchs/${matchId}`);
  }

  // Cascade supprime participants et événements automatiquement.
  await supabase.from("matches").delete().eq("id", matchId);

  redirect("/matchs");
}
