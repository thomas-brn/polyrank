import type { MatchData } from "@/components/match-card";
import type { MatchFormat } from "@/components/match-format-tabs";
import type { Mode } from "@/lib/mode";
import { getDateFrom } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { getGameId } from "@/lib/supabase/queries";

const MATCH_SELECT =
  "id, format, status, is_friendly, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

const PAGE = 1000; // limite par défaut de PostgREST sur une page

export type UserMatchsFilters = {
  userId: string;
  mode: Mode;
  period: string;
  matchFormat: MatchFormat;
  duoPartnerId?: string;
};

/**
 * Match_ids où `userId` et `partnerId` ont joué du même côté (paginé pour
 * dépasser la limite de 1000 lignes de PostgREST).
 */
async function getDuoMatchIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  partnerId: string,
): Promise<string[]> {
  const sideMap = async (profileId: string) => {
    const rows: { match_id: string; side: string }[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("match_participants")
        .select("match_id, side")
        .eq("profile_id", profileId)
        .range(from, from + PAGE - 1);
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE) break;
      from += PAGE;
    }
    return rows;
  };

  const [userParts, partnerParts] = await Promise.all([sideMap(userId), sideMap(partnerId)]);
  const partnerSide = new Map(partnerParts.map((p) => [p.match_id, p.side]));
  return userParts.filter((up) => partnerSide.get(up.match_id) === up.side).map((up) => up.match_id);
}

/**
 * Une page de l'historique des matchs d'un joueur (bornes `from`..`to`
 * incluses). Source de vérité UNIQUE partagée entre le rendu initial et
 * l'action « Voir plus », pour garantir un tri et un filtrage identiques.
 *
 * Le tri inclut `id` en départage : sans lui, deux matchs de même `status` et
 * même `played_at` (fréquent sur les imports legacy) peuvent s'ordonner
 * différemment d'un appel à l'autre, faisant que la page suivante recouvre la
 * précédente — d'où un « Voir plus » qui n'affiche rien de neuf.
 */
export async function fetchUserMatchsPage(
  filters: UserMatchsFilters,
  from: number,
  to: number,
): Promise<MatchData[]> {
  const { userId, mode, period, matchFormat, duoPartnerId } = filters;
  const supabase = await createClient();

  const gameId = await getGameId(mode);
  if (!gameId) return [];

  const dateFrom = getDateFrom(period);

  let duoMatchIds: string[] | null = null;
  if (matchFormat === "2v2" && duoPartnerId) {
    duoMatchIds = await getDuoMatchIds(supabase, userId, duoPartnerId);
    if (duoMatchIds.length === 0) return [];
  }

  // matches reste la table principale ; le filtre "participant = userId" passe
  // par un embed !inner aliasé (évite une URL énorme sur les gros historiques).
  let mq = supabase
    .from("matches")
    .select(`${MATCH_SELECT}, me:match_participants!inner(profile_id)`)
    .eq("game_id", gameId)
    .eq("me.profile_id", userId)
    .order("status", { ascending: true }) // CONTESTE / EN_APPEL avant VALIDE
    .order("played_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (duoMatchIds !== null) mq = mq.in("id", duoMatchIds);
  if (matchFormat === "1v1") mq = mq.eq("format", "1V1");
  if (matchFormat === "2v2") mq = mq.eq("format", "2V2");
  if (dateFrom) mq = mq.gte("played_at", dateFrom);

  const { data } = await mq.returns<MatchData[]>();
  return data ?? [];
}
