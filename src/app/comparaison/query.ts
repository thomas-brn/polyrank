import { unstable_cache } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";

import type { MatchData } from "@/components/match-card";
import type { MatchFormat } from "@/components/match-format-tabs";
import type { Mode } from "@/lib/mode";
import { getDateFrom } from "@/lib/period";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  getDuoPartnerPseudos,
  getGameId,
  getUserDuoRatings,
} from "@/lib/supabase/queries";

/** Limite par défaut d'une page PostgREST. */
const PAGE = 1000;

const MATCH_SELECT =
  "id, format, status, is_friendly, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

export type ComparisonFilters = {
  mode: Mode;
  matchFormat: MatchFormat;
  period: string;
};

export type PlayerIdentity = {
  id: string;
  pseudo: string;
  annee: string | null;
  schoolName: string | null;
};

/** Moyennes par match des stats FifaChamp (null si le jeu n'en a pas). */
export type FifaAverages = {
  buts: number;
  jaunes: number;
  rouges: number;
  blessures: number;
  retournees: number;
  cf: number;
};

export type PlayerStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** En pourcentage, `null` si aucun match sur la période. */
  winrate: number | null;
  fifa: FifaAverages | null;
};

export type PlayerElo = {
  /** Intitulé de la valeur affichée (« Elo Global », « Elo 2v2 »...). */
  label: string;
  /** Précision sous l'intitulé (partenaire du duo en 2v2). */
  sub?: string;
  rating: number | null;
  rank: number | null;
  /** Meilleur Elo Global jamais atteint (onglet Global uniquement). */
  record: number | null;
};

export type HeadToHead = {
  /** Nombre total de confrontations sur le périmètre demandé. */
  versusPlayed: number;
  /** Les confrontations les plus récentes, détaillées pour l'affichage. */
  versus: MatchData[];
  versusWinsA: number;
  versusWinsB: number;
  versusDraws: number;
  /** Buts cumulés sur les confrontations (jeux avec score uniquement). */
  goalsA: number;
  goalsB: number;
  /** Matchs joués dans la même équipe. */
  togetherPlayed: number;
  togetherWins: number;
};

const EMPTY_STATS: PlayerStats = {
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  winrate: null,
  fifa: null,
};

function formatFilter(matchFormat: MatchFormat): "1V1" | "2V2" | null {
  if (matchFormat === "1v1") return "1V1";
  if (matchFormat === "2v2") return "2V2";
  return null;
}

/** Identité d'un joueur, ou `null` si l'id ne correspond à aucun profil. */
export async function fetchPlayerIdentity(
  profileId: string,
): Promise<PlayerIdentity | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, pseudo, annee, schools(name)")
    .eq("id", profileId)
    .single<{
      id: string;
      pseudo: string | null;
      annee: string | null;
      schools: { name: string } | null;
    }>();
  if (!data?.pseudo) return null;
  return {
    id: data.id,
    pseudo: data.pseudo,
    annee: data.annee,
    schoolName: data.schools?.name ?? null,
  };
}

type StatMatchRow = {
  winner_side: "A" | "B" | "NUL";
  score_a: number | null;
  score_b: number | null;
  stats: Record<string, Record<string, number>> | null;
  match_participants: { side: "A" | "B"; profile_id: string | null }[];
};

/**
 * Bilan d'un joueur sur la période / le format demandés : matchs, victoires et
 * moyennes de stats. Comme sur la fiche joueur, `matches` reste la table
 * principale et le filtre « participant = joueur » passe par un embed !inner
 * aliasé (évite une URL énorme sur les gros historiques).
 */
export async function fetchPlayerStats(
  profileId: string,
  filters: ComparisonFilters,
): Promise<PlayerStats> {
  const supabase = await createClient();
  const gameId = await getGameId(filters.mode);
  if (!gameId) return EMPTY_STATS;

  const dateFrom = getDateFrom(filters.period);
  const fmt = formatFilter(filters.matchFormat);

  const rows: StatMatchRow[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("matches")
      .select(
        "winner_side, score_a, score_b, stats, match_participants(side, profile_id), me:match_participants!inner(profile_id)",
      )
      .eq("game_id", gameId)
      .eq("me.profile_id", profileId);
    if (fmt) q = q.eq("format", fmt);
    if (dateFrom) q = q.gte("played_at", dateFrom);
    const { data } = await q
      .range(from, from + PAGE - 1)
      .returns<StatMatchRow[]>();
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  let wins = 0;
  let draws = 0;
  const withStats: { row: StatMatchRow; side: "A" | "B" }[] = [];

  for (const row of rows) {
    const side = row.match_participants.find(
      (p) => p.profile_id === profileId,
    )?.side;
    if (!side) continue;
    if (row.winner_side === "NUL") draws += 1;
    else if (row.winner_side === side) wins += 1;
    if (row.stats) withStats.push({ row, side });
  }

  const played = rows.length;
  const fifa =
    filters.mode === "fifachamp" && withStats.length > 0
      ? averageFifaStats(withStats)
      : null;

  return {
    played,
    wins,
    draws,
    losses: played - wins - draws,
    winrate: played > 0 ? Math.round((wins / played) * 100) : null,
    fifa,
  };
}

function averageFifaStats(
  entries: { row: StatMatchRow; side: "A" | "B" }[],
): FifaAverages {
  let buts = 0,
    jaunes = 0,
    rouges = 0,
    blessures = 0,
    retournees = 0,
    cf = 0;

  for (const { row, side } of entries) {
    const s = row.stats?.[side.toLowerCase()] ?? {};
    buts += (side === "A" ? row.score_a : row.score_b) ?? 0;
    jaunes += s.cartons_jaunes ?? 0;
    rouges += s.cartons_rouges ?? 0;
    blessures += s.sorties_blessure ?? 0;
    retournees += s.retournees ?? 0;
    cf += s.coups_francs ?? 0;
  }

  const n = entries.length;
  return {
    buts: buts / n,
    jaunes: jaunes / n,
    rouges: rouges / n,
    blessures: blessures / n,
    retournees: retournees / n,
    cf: cf / n,
  };
}

/**
 * Elo affiché pour l'onglet courant : Global et 1v1 lisent `player_ratings`,
 * 2v2 prend le meilleur duo du joueur (les duos n'ont pas de rating individuel).
 */
export async function fetchPlayerElo(
  profileId: string,
  filters: ComparisonFilters,
): Promise<PlayerElo> {
  const supabase = await createClient();
  const gameId = await getGameId(filters.mode);
  const empty: PlayerElo = {
    label: "Elo",
    rating: null,
    rank: null,
    record: null,
  };
  if (!gameId) return empty;

  if (filters.matchFormat === "2v2") {
    const duos = await getUserDuoRatings(gameId, profileId);
    const best = duos[0];
    if (!best) return { ...empty, label: "Elo 2v2" };
    const partnerId =
      best.profile_lo === profileId ? best.profile_hi : best.profile_lo;
    const pseudos = await getDuoPartnerPseudos(gameId, profileId);
    const { count } = await supabase
      .from("duo_ratings")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .gt("rating", best.rating);
    return {
      label: "Elo 2v2",
      sub: `avec ${pseudos[partnerId] ?? "?"}`,
      rating: best.rating,
      rank: (count ?? 0) + 1,
      record: null,
    };
  }

  const scope = filters.matchFormat === "1v1" ? "1V1" : "GLOBAL";
  const label = filters.matchFormat === "1v1" ? "Elo 1v1" : "Elo Global";

  const { data: rating } = await supabase
    .from("player_ratings")
    .select("rating")
    .eq("game_id", gameId)
    .eq("profile_id", profileId)
    .eq("scope", scope)
    .maybeSingle<{ rating: number }>();

  if (!rating) return { ...empty, label };

  const [{ count }, record] = await Promise.all([
    supabase
      .from("player_ratings")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("scope", scope)
      .gt("rating", rating.rating),
    scope === "GLOBAL"
      ? maxGlobalRating(gameId, profileId, rating.rating)
      : Promise.resolve(null),
  ]);

  return {
    label,
    rating: rating.rating,
    rank: (count ?? 0) + 1,
    record,
  };
}

/** Record = meilleur Elo Global jamais atteint sur l'historique rejoué. */
async function maxGlobalRating(
  gameId: string,
  profileId: string,
  currentRating: number,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rating_history")
    .select("rating")
    .eq("game_id", gameId)
    .eq("profile_id", profileId)
    .eq("scope", "GLOBAL")
    .order("rating", { ascending: false })
    .limit(1)
    .maybeSingle<{ rating: number }>();
  return Math.max(data?.rating ?? currentRating, currentRating);
}

/** Participations d'un joueur sur le jeu courant (paginé), match_id -> côté. */
async function sideByMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  gameId: string,
): Promise<Map<string, string>> {
  const rows: { match_id: string; side: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("match_participants")
      .select("match_id, side, matches!inner(game_id)")
      .eq("profile_id", profileId)
      .eq("matches.game_id", gameId)
      .range(from, from + PAGE - 1)
      .returns<{ match_id: string; side: string }[]>();
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return new Map(rows.map((r) => [r.match_id, r.side]));
}

/**
 * Face-à-face : matchs où les deux joueurs se sont affrontés (camps opposés),
 * et matchs où ils ont joué ensemble (même camp).
 */
export async function fetchHeadToHead(
  idA: string,
  idB: string,
  filters: ComparisonFilters,
  previewCount: number,
): Promise<HeadToHead> {
  const empty: HeadToHead = {
    versusPlayed: 0,
    versus: [],
    versusWinsA: 0,
    versusWinsB: 0,
    versusDraws: 0,
    goalsA: 0,
    goalsB: 0,
    togetherPlayed: 0,
    togetherWins: 0,
  };

  const supabase = await createClient();
  const gameId = await getGameId(filters.mode);
  if (!gameId) return empty;

  const sidesB = await sideByMatch(supabase, idB, gameId);
  if (sidesB.size === 0) return empty;

  const dateFrom = getDateFrom(filters.period);
  const fmt = formatFilter(filters.matchFormat);

  // Les matchs du joueur A sont lus depuis match_participants (indexé sur
  // profile_id) plutôt qu'avec un .in("id", ...) sur la liste des matchs
  // communs : cette liste dépassait la longueur d'URL acceptée et échouait
  // silencieusement (cf. le même correctif sur la fiche joueur). Le croisement
  // avec le joueur B se fait ensuite en mémoire.
  type LightRow = {
    side: "A" | "B";
    matches: {
      id: string;
      winner_side: "A" | "B" | "NUL";
      score_a: number | null;
      score_b: number | null;
      played_at: string;
    };
  };

  const rows: LightRow[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("match_participants")
      .select(
        "side, match_id, matches!inner(id, winner_side, score_a, score_b, played_at)",
      )
      .eq("profile_id", idA)
      .eq("matches.game_id", gameId)
      .order("match_id", { ascending: true });
    if (fmt) q = q.eq("matches.format", fmt);
    if (dateFrom) q = q.gte("matches.played_at", dateFrom);
    const { data } = await q
      .range(from, from + PAGE - 1)
      .returns<LightRow[]>();
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  const result: HeadToHead = { ...empty, versus: [] };
  const versusIds: { id: string; played_at: string }[] = [];

  for (const row of rows) {
    const match = row.matches;
    const sideA = row.side;
    const sideB = sidesB.get(match.id) as "A" | "B" | undefined;
    if (!sideB) continue;

    if (sideA === sideB) {
      result.togetherPlayed += 1;
      if (match.winner_side === sideA) result.togetherWins += 1;
      continue;
    }

    versusIds.push({ id: match.id, played_at: match.played_at });
    if (match.winner_side === "NUL") result.versusDraws += 1;
    else if (match.winner_side === sideA) result.versusWinsA += 1;
    else result.versusWinsB += 1;
    result.goalsA += (sideA === "A" ? match.score_a : match.score_b) ?? 0;
    result.goalsB += (sideB === "A" ? match.score_a : match.score_b) ?? 0;
  }

  result.versusPlayed = versusIds.length;
  if (versusIds.length === 0) return result;

  versusIds.sort((m1, m2) =>
    m1.played_at === m2.played_at
      ? m2.id.localeCompare(m1.id)
      : m2.played_at.localeCompare(m1.played_at),
  );

  const { data: recent } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .in(
      "id",
      versusIds.slice(0, previewCount).map((m) => m.id),
    )
    .order("played_at", { ascending: false })
    .order("id", { ascending: false })
    .returns<MatchData[]>();

  result.versus = recent ?? [];
  return result;
}

/** Point de la courbe Elo comparée. */
export type EloPoint = { rating: number; at: number };

/**
 * Historique Elo d'un joueur sur le périmètre courant. Non disponible en 2v2 :
 * `duo_rating_history` est indexée par paire, pas par joueur.
 */
export async function fetchEloHistory(
  profileId: string,
  filters: ComparisonFilters,
): Promise<EloPoint[]> {
  if (filters.matchFormat === "2v2") return [];

  const supabase = await createClient();
  const gameId = await getGameId(filters.mode);
  if (!gameId) return [];

  const scope = filters.matchFormat === "1v1" ? "1V1" : "GLOBAL";
  const dateFrom = getDateFrom(filters.period);

  const points: EloPoint[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("rating_history")
      .select("rating, played_at")
      .eq("game_id", gameId)
      .eq("profile_id", profileId)
      .eq("scope", scope)
      .order("played_at", { ascending: true })
      .order("id", { ascending: true });
    if (dateFrom) q = q.gte("played_at", dateFrom);
    const { data } = await q
      .range(from, from + PAGE - 1)
      .returns<{ rating: number; played_at: string }[]>();
    const page = data ?? [];
    points.push(
      ...page.map((p) => ({
        rating: p.rating,
        at: new Date(p.played_at).getTime(),
      })),
    );
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return points;
}

/** Joueurs les mieux classés du jeu courant, proposés par défaut au choix. */
export async function fetchTopPlayers(
  mode: Mode,
  limit = 8,
): Promise<{ id: string; pseudo: string; schoolName: string | null }[]> {
  const supabase = await createClient();
  const gameId = await getGameId(mode);
  if (!gameId) return [];

  const { data } = await supabase
    .from("player_ratings")
    .select("rating, profiles(id, pseudo, schools(name))")
    .eq("game_id", gameId)
    .eq("scope", "GLOBAL")
    .order("rating", { ascending: false })
    .limit(limit)
    .returns<
      {
        rating: number;
        profiles: {
          id: string;
          pseudo: string | null;
          schools: { name: string } | null;
        } | null;
      }[]
    >();

  return (data ?? [])
    .map((row) => row.profiles)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.pseudo))
    .map((p) => ({
      id: p.id,
      pseudo: p.pseudo as string,
      schoolName: p.schools?.name ?? null,
    }));
}

/** Maxima du site par axe du radar, servant d'échelle commune. */
export type StatMaxima = {
  winrate: number;
  buts: number;
  jaunes: number;
  rouges: number;
  blessures: number;
  retournees: number;
  cf: number;
};

/** Un joueur ne fixe le plafond d'un axe qu'au-delà de ce nombre de matchs. */
const MIN_MATCHES_FOR_MAXIMA = 10;

type Tally = {
  played: number;
  wins: number;
  statMatches: number;
  buts: number;
  jaunes: number;
  rouges: number;
  blessures: number;
  retournees: number;
  cf: number;
};

function emptyTally(): Tally {
  return {
    played: 0,
    wins: 0,
    statMatches: 0,
    buts: 0,
    jaunes: 0,
    rouges: 0,
    blessures: 0,
    retournees: 0,
    cf: 0,
  };
}

/**
 * Meilleure valeur atteinte sur le site pour chaque axe du radar, sur le même
 * périmètre (jeu, format, période) que la comparaison affichée. Seuls les
 * joueurs à plus de 10 matchs comptent, sinon un joueur à deux matchs fixerait
 * un plafond absurde.
 *
 * C'est une lecture de tous les matchs du jeu : le résultat est mis en cache
 * (10 min) et les pages sont demandées en parallèle. Le client est construit
 * sans cookies, à la fois parce que ces tables sont en lecture publique et
 * parce qu'`unstable_cache` interdit les sources dynamiques.
 */
const computeStatMaxima = unstable_cache(
  async (
    mode: Mode,
    matchFormat: MatchFormat,
    period: string,
  ): Promise<StatMaxima | null> => {
    const supabase = createPublicClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: game } = await supabase
      .from("games")
      .select("id")
      .eq("slug", mode)
      .single<{ id: string }>();
    if (!game) return null;

    const dateFrom = getDateFrom(period);
    const fmt = formatFilter(matchFormat);

    let countQuery = supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("game_id", game.id);
    if (fmt) countQuery = countQuery.eq("format", fmt);
    if (dateFrom) countQuery = countQuery.gte("played_at", dateFrom);
    const { count } = await countQuery;

    const pageQuery = (index: number) => {
      let q = supabase
        .from("matches")
        .select(
          "winner_side, score_a, score_b, stats, match_participants(side, profile_id)",
        )
        .eq("game_id", game.id);
      if (fmt) q = q.eq("format", fmt);
      if (dateFrom) q = q.gte("played_at", dateFrom);
      return q
        .range(index * PAGE, index * PAGE + PAGE - 1)
        .returns<StatMatchRow[]>();
    };

    const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
    const responses = await Promise.all(
      Array.from({ length: pages }, (_, i) => pageQuery(i)),
    );

    const tallies = new Map<string, Tally>();
    for (const { data } of responses) {
      for (const row of data ?? []) {
        for (const participant of row.match_participants) {
          const id = participant.profile_id;
          if (!id) continue;
          const side = participant.side;
          let t = tallies.get(id);
          if (!t) {
            t = emptyTally();
            tallies.set(id, t);
          }
          t.played += 1;
          if (row.winner_side === side) t.wins += 1;
          if (!row.stats) continue;
          const stats = row.stats[side.toLowerCase()] ?? {};
          t.statMatches += 1;
          t.buts += (side === "A" ? row.score_a : row.score_b) ?? 0;
          t.jaunes += stats.cartons_jaunes ?? 0;
          t.rouges += stats.cartons_rouges ?? 0;
          t.blessures += stats.sorties_blessure ?? 0;
          t.retournees += stats.retournees ?? 0;
          t.cf += stats.coups_francs ?? 0;
        }
      }
    }

    const maxima: StatMaxima = {
      winrate: 0,
      buts: 0,
      jaunes: 0,
      rouges: 0,
      blessures: 0,
      retournees: 0,
      cf: 0,
    };

    for (const t of tallies.values()) {
      if (t.played > MIN_MATCHES_FOR_MAXIMA) {
        maxima.winrate = Math.max(maxima.winrate, (t.wins / t.played) * 100);
      }
      if (t.statMatches > MIN_MATCHES_FOR_MAXIMA) {
        const n = t.statMatches;
        maxima.buts = Math.max(maxima.buts, t.buts / n);
        maxima.jaunes = Math.max(maxima.jaunes, t.jaunes / n);
        maxima.rouges = Math.max(maxima.rouges, t.rouges / n);
        maxima.blessures = Math.max(maxima.blessures, t.blessures / n);
        maxima.retournees = Math.max(maxima.retournees, t.retournees / n);
        maxima.cf = Math.max(maxima.cf, t.cf / n);
      }
    }

    return maxima;
  },
  ["comparaison-stat-maxima"],
  { revalidate: 600 },
);

export function fetchStatMaxima(
  filters: ComparisonFilters,
): Promise<StatMaxima | null> {
  return computeStatMaxima(filters.mode, filters.matchFormat, filters.period);
}
