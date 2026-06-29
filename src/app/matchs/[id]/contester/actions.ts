"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ContestState = { error?: string };

function readStat(formData: FormData, prefix: string, key: string): number {
  const val = Number(formData.get(`stats_${prefix}_${key}`));
  return Number.isFinite(val) && val >= 0 ? Math.floor(val) : 0;
}

export async function contestMatch(
  _prev: ContestState,
  formData: FormData,
): Promise<ContestState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const matchId = String(formData.get("match_id") ?? "");
  if (!matchId) return { error: "Match introuvable." };

  const { data: match } = await supabase
    .from("matches")
    .select("id, games(has_score)")
    .eq("id", matchId)
    .single<{ id: string; games: { has_score: boolean } | null }>();

  if (!match) return { error: "Match introuvable." };

  const hasScore = match.games?.has_score ?? false;

  let proposedChanges: Record<string, unknown>;

  if (hasScore) {
    const scoreA = Number(formData.get("score_a"));
    const scoreB = Number(formData.get("score_b"));
    if (
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0
    ) {
      return { error: "Saisis un score valide." };
    }

    const crA = readStat(formData, "a", "cartons_rouges");
    const crB = readStat(formData, "b", "cartons_rouges");
    const forfaitA = crA >= 5;
    const forfaitB = crB >= 5;

    let winner: "A" | "B" | "NUL";
    if (forfaitA && !forfaitB) {
      winner = "A";
    } else if (forfaitB && !forfaitA) {
      winner = "B";
    } else {
      const totalA = scoreA + crA;
      const totalB = scoreB + crB;
      if (totalA !== totalB) {
        winner = totalA > totalB ? "A" : "B";
      } else if (crA !== crB) {
        winner = crA > crB ? "A" : "B";
      } else {
        const cjA = readStat(formData, "a", "cartons_jaunes");
        const cjB = readStat(formData, "b", "cartons_jaunes");
        if (cjA !== cjB) {
          winner = cjA > cjB ? "A" : "B";
        } else {
          const fscA = readStat(formData, "a", "fautes_sans_carton");
          const fscB = readStat(formData, "b", "fautes_sans_carton");
          winner = fscA > fscB ? "A" : fscA < fscB ? "B" : "NUL";
        }
      }
    }

    proposedChanges = {
      winner_side: winner,
      score_a: scoreA,
      score_b: scoreB,
      stats: {
        a: {
          cartons_rouges: crA,
          cartons_jaunes: readStat(formData, "a", "cartons_jaunes"),
          retournees: readStat(formData, "a", "retournees"),
          coups_francs: readStat(formData, "a", "coups_francs"),
          sorties_blessure: readStat(formData, "a", "sorties_blessure"),
          fautes_sans_carton: readStat(formData, "a", "fautes_sans_carton"),
        },
        b: {
          cartons_rouges: crB,
          cartons_jaunes: readStat(formData, "b", "cartons_jaunes"),
          retournees: readStat(formData, "b", "retournees"),
          coups_francs: readStat(formData, "b", "coups_francs"),
          sorties_blessure: readStat(formData, "b", "sorties_blessure"),
          fautes_sans_carton: readStat(formData, "b", "fautes_sans_carton"),
        },
      },
    };
  } else {
    const winnerInput = String(formData.get("winner") ?? "");
    if (winnerInput !== "A" && winnerInput !== "B") {
      return { error: "Indique qui a gagné." };
    }
    proposedChanges = { winner_side: winnerInput };
  }

  const { error } = await supabase.rpc("contest_match", {
    p_match_id: matchId,
    p_proposed: proposedChanges,
  });

  if (error) return { error: error.message };

  redirect(`/matchs/${matchId}`);
}
