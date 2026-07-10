"use server";

import { createClient } from "@/lib/supabase/server";
import { getDateFrom } from "@/lib/period";
import type { MatchData } from "@/components/match-card";

const MATCH_SELECT =
  "id, format, status, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

export async function loadMoreMatches(
  userId: string,
  mode: string,
  period: string,
  offset: number,
): Promise<MatchData[]> {
  const supabase = await createClient();
  const dateFrom = getDateFrom(period);

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  if (!game) return [];

  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("profile_id", userId);
  const historyIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);

  if (historyIds.length === 0) return [];

  let mq = supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("game_id", game.id)
    .in("id", historyIds)
    .order("status", { ascending: true })   // CONTESTE (C) et EN_APPEL (E) avant VALIDE (V)
    .order("played_at", { ascending: false })
    .range(offset, offset + 10);
  if (dateFrom) mq = mq.gte("played_at", dateFrom);

  const { data } = await mq.returns<MatchData[]>();
  return data ?? [];
}
