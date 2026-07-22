import type { MatchData } from "@/components/match-card";
import type { MatchFormat } from "@/components/match-format-tabs";
import type { Mode } from "@/lib/mode";
import { createClient } from "@/lib/supabase/server";
import { getGameId, getSchools } from "@/lib/supabase/queries";

const MATCH_SELECT =
  "id, format, status, is_friendly, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

export type MatchsFilters = {
  mode: Mode;
  matchFormat: MatchFormat;
  schoolSlug?: string;
  annee?: string;
};

/**
 * Récupère une page de l'historique général des matchs validés (bornes `from`
 * à `to` incluses). Partagé entre la page (rendu initial) et l'action
 * « Voir plus », pour garder une seule source de vérité sur le filtrage.
 */
export async function fetchMatchsPage(
  filters: MatchsFilters,
  from: number,
  to: number,
): Promise<MatchData[]> {
  const { mode, matchFormat, schoolSlug, annee } = filters;
  const supabase = await createClient();

  const gameId = await getGameId(mode);
  if (!gameId) return [];

  let filterSchoolId: string | null = null;
  if (schoolSlug) {
    const schools = await getSchools();
    filterSchoolId = schools.find((s) => s.slug === schoolSlug)?.id ?? null;
  }

  let matchIds: string[] | null = null;
  if (filterSchoolId || annee) {
    let pq = supabase.from("profiles").select("id").not("pseudo", "is", null);
    if (filterSchoolId) pq = pq.eq("school_id", filterSchoolId);
    if (annee) pq = pq.eq("annee", annee);
    const { data: pdata } = await pq.returns<{ id: string }[]>();
    const pids = (pdata ?? []).map((p) => p.id);
    if (pids.length === 0) return [];

    const { data: parts } = await supabase
      .from("match_participants")
      .select("match_id")
      .in("profile_id", pids)
      .returns<{ match_id: string }[]>();
    matchIds = [...new Set((parts ?? []).map((p) => p.match_id))];
    if (matchIds.length === 0) return [];
  }

  let mq = supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("game_id", gameId)
    .eq("status", "VALIDE")
    .order("played_at", { ascending: false })
    .range(from, to);
  if (matchIds !== null) mq = mq.in("id", matchIds);
  if (matchFormat === "1v1") mq = mq.eq("format", "1V1");
  if (matchFormat === "2v2") mq = mq.eq("format", "2V2");
  const { data } = await mq.returns<MatchData[]>();
  return data ?? [];
}
