import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { type MatchData } from "@/components/match-card";
import { MatchHistoryList } from "@/components/match-history-list";
import { PeriodTabs, type Period } from "@/components/period-tabs";
import { ANNEE_LABELS } from "@/lib/constants";
import { getMode, MODES, type Mode } from "@/lib/mode";
import { getDateFrom } from "@/lib/period";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MATCH_SELECT =
  "id, format, status, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

type ProfileRow = {
  id: string;
  pseudo: string | null;
  annee: string | null;
  schools: { name: string } | null;
};
type RatingRow = { scope: string; rating: number; played: number; won: number; lost: number };
type HistoryRow = { scope: string; rating: number; played_at: string };
type MatchStat = {
  winner_side: "A" | "B" | "NUL";
  stats: Record<string, Record<string, number>> | null;
  match_participants: { side: "A" | "B"; profile_id: string | null }[];
};

function toValidPeriod(raw: string | undefined): Period {
  return (["all", "season", "month", "week"] as const).includes(raw as Period)
    ? (raw as Period)
    : "all";
}

async function rankOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameId: string,
  scope: string,
  rating: number,
): Promise<number> {
  const { count } = await supabase
    .from("player_ratings")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("scope", scope)
    .gt("rating", rating);
  return (count ?? 0) + 1;
}

export default async function JoueurPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  if (!isSupabaseConfigured) {
    notFound();
  }

  const { id } = await params;
  const { period: rawPeriod } = await searchParams;
  const period = toValidPeriod(rawPeriod);

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, pseudo, annee, schools(name)")
    .eq("id", id)
    .single<ProfileRow>();

  if (!profile?.pseudo) {
    notFound();
  }

  const mode = await getMode();
  const ecoleLabel = profile.schools?.name ?? "-";
  const anneeLabel = profile.annee ? ANNEE_LABELS[profile.annee] : null;

  // Anciens pseudos
  const { data: pseudoHistory } = await supabase
    .from("pseudo_history")
    .select("pseudo, changed_at")
    .eq("profile_id", id)
    .order("changed_at", { ascending: false });

  return (
    <div>
      <div className="mb-2">
        <PageHero title={profile.pseudo}>
          <dl className="flex flex-col gap-1 text-sm text-brand-50">
            <div className="flex items-center gap-2">
              <dt className="text-brand-200">École</dt>
              <dd className="font-medium text-white">{ecoleLabel}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-brand-200">Année</dt>
              <dd className="font-medium text-white">{anneeLabel ?? "-"}</dd>
            </div>
          </dl>
        </PageHero>
      </div>

      {pseudoHistory && pseudoHistory.length > 0 ? (
        <details className="mb-4 -mt-1">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 select-none">
            Anciens pseudos ({pseudoHistory.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
            {pseudoHistory.map((h, i) => (
              <li key={i}>
                {h.pseudo}{" "}
                <span className="text-xs text-slate-400">
                  (jusqu&apos;au{" "}
                  {new Date(h.changed_at).toLocaleDateString("fr-FR")})
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Suspense fallback={<EloSkeleton mode={mode} />}>
        <EloSection userId={id} mode={mode} />
      </Suspense>

      <p className="mt-6 mb-2 ml-2 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
        Statistiques
      </p>

      <PeriodTabs current={period} basePath={`/joueurs/${id}`} />

      <div className="mt-3 flex flex-col gap-3">
        <Suspense key={period} fallback={<StatsSpinner />}>
          <PeriodStats userId={id} period={period} mode={mode} />
        </Suspense>

        <details className="group flex flex-col gap-3">
          <div className="order-1 flex flex-col gap-3">
            <Suspense key={period} fallback={<DetailedStatsSpinner />}>
              <DetailedStats userId={id} period={period} mode={mode} />
            </Suspense>
          </div>
          <summary className="order-2 flex cursor-pointer list-none items-center justify-center gap-1 text-[13px] font-medium text-slate-400 hover:text-slate-600 select-none">
            <span className="group-open:hidden">Plus de statistiques</span>
            <span className="hidden group-open:inline">Moins de statistiques</span>
            <svg
              className="size-3.5 transition-transform group-open:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
        </details>
      </div>

      <Suspense key={`history-${period}`} fallback={<MatchHistorySpinner />}>
        <MatchHistory userId={id} period={period} mode={mode} />
      </Suspense>
    </div>
  );
}

// ─── ELO ─────────────────────────────────────────────────────────────────────

async function EloSection({ userId, mode }: { userId: string; mode: Mode }) {
  const supabase = await createClient();
  const sport = MODES[mode].sport;

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  if (!game) return null;

  const { data: prs } = await supabase
    .from("player_ratings")
    .select("scope, rating, played, won, lost")
    .eq("game_id", game.id)
    .eq("profile_id", userId)
    .returns<RatingRow[]>();

  const eloGlobal = prs?.find((r) => r.scope === "GLOBAL") ?? null;
  const elo1v1 = prs?.find((r) => r.scope === "1V1") ?? null;

  let bestDuo: { rating: number; partnerName: string } | null = null;
  let rankDuo: number | null = null;

  const { data: duos } = await supabase
    .from("duo_ratings")
    .select("profile_lo, profile_hi, rating")
    .eq("game_id", game.id)
    .or(`profile_lo.eq.${userId},profile_hi.eq.${userId}`)
    .order("rating", { ascending: false })
    .limit(1)
    .returns<{ profile_lo: string; profile_hi: string; rating: number }[]>();
  const topDuo = duos?.[0];
  if (topDuo) {
    const partnerId = topDuo.profile_lo === userId ? topDuo.profile_hi : topDuo.profile_lo;
    const { data: partner } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", partnerId)
      .single<{ pseudo: string | null }>();
    bestDuo = { rating: topDuo.rating, partnerName: partner?.pseudo ?? "?" };
    const { count } = await supabase
      .from("duo_ratings")
      .select("*", { count: "exact", head: true })
      .eq("game_id", game.id)
      .gt("rating", topDuo.rating);
    rankDuo = (count ?? 0) + 1;
  }

  const rankGlobal = eloGlobal ? await rankOf(supabase, game.id, "GLOBAL", eloGlobal.rating) : null;
  const rank1v1 = elo1v1 ? await rankOf(supabase, game.id, "1V1", elo1v1.rating) : null;

  if (!eloGlobal && !elo1v1 && !bestDuo) return null;

  const cards: { title: string; sub?: string; rating?: number; rank: number | null }[] = [
    { title: `Classement ${sport}`, sub: "général", rating: eloGlobal?.rating, rank: rankGlobal },
    { title: `Classement ${sport} 1v1`, sub: "général", rating: elo1v1?.rating, rank: rank1v1 },
    { title: `Classement ${sport} 2v2`, sub: bestDuo ? `avec ${bestDuo.partnerName}` : undefined, rating: bestDuo?.rating, rank: rankDuo },
  ];

  return (
    <div className="mt-6 flex flex-col gap-2">
      {cards.map((c) => (
        <EloCard key={c.title} {...c} />
      ))}
    </div>
  );
}

function EloSkeleton({ mode }: { mode: Mode }) {
  const count = 3;
  return (
    <div className="mt-6 flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
            <div className="h-2 w-16 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-6 w-10 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-8 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// ─── Stats temporelles ────────────────────────────────────────────────────────

function StatsSpinner() {
  return (
    <section className="flex items-center justify-center py-8">
      <div className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
    </section>
  );
}

async function PeriodStats({
  userId,
  period,
  mode,
}: {
  userId: string;
  period: Period;
  mode: Mode;
}) {
  const supabase = await createClient();
  const dateFrom = getDateFrom(period);

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("profile_id", userId);
  const historyIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);

  let periodData: MatchStat[] = [];
  if (historyIds.length > 0 && game) {
    let q = supabase
      .from("matches")
      .select("winner_side, stats, match_participants(side, profile_id)")
      .eq("game_id", game.id)
      .in("id", historyIds);
    if (dateFrom) q = q.gte("played_at", dateFrom);
    const { data } = await q.returns<MatchStat[]>();
    periodData = data ?? [];
  }

  const played = periodData.length;
  const wins = periodData.filter((m) => {
    const side = m.match_participants.find((p) => p.profile_id === userId)?.side;
    return side && m.winner_side === side;
  }).length;
  const winrate = played > 0 ? Math.round((wins / played) * 100) : null;

  return (
    <section>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-1 flex-col items-center py-3">
          <span className="text-xl font-bold text-slate-800">{played}</span>
          <span className="text-[11px] text-slate-400">Matchs</span>
        </div>
        <div className="w-px self-stretch bg-slate-100" />
        <div className="flex flex-1 flex-col items-center py-3">
          <span className="text-xl font-bold text-slate-800">{wins}</span>
          <span className="text-[11px] text-slate-400">Victoires</span>
        </div>
        <div className="w-px self-stretch bg-slate-100" />
        <div className="flex flex-1 flex-col items-center py-3">
          <span className="text-xl font-bold text-slate-800">
            {winrate != null ? `${winrate}%` : "—"}
          </span>
          <span className="text-[11px] text-slate-400">% de victoires</span>
        </div>
      </div>
    </section>
  );
}

// ─── Historique des matchs ────────────────────────────────────────────────────

async function MatchHistory({
  userId,
  period,
  mode,
}: {
  userId: string;
  period: Period;
  mode: Mode;
}) {
  const supabase = await createClient();
  const dateFrom = getDateFrom(period);
  const sport = MODES[mode].sport;

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("profile_id", userId);
  const historyIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);

  let raw: MatchData[] = [];
  if (historyIds.length > 0 && game) {
    let mq = supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("game_id", game.id)
      .in("id", historyIds)
      .order("played_at", { ascending: false })
      .range(0, 20);
    if (dateFrom) mq = mq.gte("played_at", dateFrom);
    const { data } = await mq.returns<MatchData[]>();
    raw = data ?? [];
  }

  const hasMore = raw.length > 20;
  const initialMatches = hasMore ? raw.slice(0, 20) : raw;

  return (
    <section>
      <p className="mt-6 mb-2 ml-2 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
        Matchs de {sport}
      </p>
      <MatchHistoryList
        initialMatches={initialMatches}
        userId={userId}
        mode={mode}
        period={period}
        sport={sport}
        hasMore={hasMore}
      />
    </section>
  );
}

// ─── Stats détaillées (dépliables) ───────────────────────────────────────────

function DetailedStatsSpinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
    </div>
  );
}

function MatchHistorySpinner() {
  return (
    <section className="mt-4 flex items-center justify-center py-6">
      <div className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
    </section>
  );
}

async function DetailedStats({
  userId,
  period,
  mode,
}: {
  userId: string;
  period: Period;
  mode: Mode;
}) {
  const supabase = await createClient();
  const dateFrom = getDateFrom(period);

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  if (!game) return null;

  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("profile_id", userId);
  const historyIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);

  // Partenaire, adversaire solo et duo adverses les plus fréquents.
  type MatchWithParts = {
    id: string;
    match_participants: {
      side: "A" | "B";
      profile_id: string | null;
      guest_name: string | null;
      profiles: { pseudo: string | null } | null;
    }[];
  };
  let topPartner: { label: string; count: number } | null = null;
  let topOpponent: { label: string; count: number } | null = null;
  let topOpponentDuo: { label: string; count: number } | null = null;

  if (historyIds.length > 0) {
    let pmq = supabase
      .from("matches")
      .select("id, match_participants(side, profile_id, guest_name, profiles(pseudo))")
      .eq("game_id", game.id)
      .in("id", historyIds);
    if (dateFrom) pmq = pmq.gte("played_at", dateFrom);
    const { data: periodMatches } = await pmq.returns<MatchWithParts[]>();

    const partnerCounts = new Map<string, number>();
    const opponentCounts = new Map<string, number>();
    const opponentDuoCounts = new Map<string, number>();

    for (const match of periodMatches ?? []) {
      const me = match.match_participants.find((p) => p.profile_id === userId);
      if (!me) continue;
      const sameSide = match.match_participants.filter((p) => p.side === me.side && p.profile_id !== userId);
      const oppSide = match.match_participants.filter((p) => p.side !== me.side);
      for (const p of sameSide) {
        const label = p.profiles?.pseudo ?? p.guest_name ?? "?";
        partnerCounts.set(label, (partnerCounts.get(label) ?? 0) + 1);
      }
      for (const p of oppSide) {
        const label = p.profiles?.pseudo ?? p.guest_name ?? "?";
        opponentCounts.set(label, (opponentCounts.get(label) ?? 0) + 1);
      }
      if (oppSide.length === 2) {
        const key = oppSide.map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?").sort().join(" & ");
        opponentDuoCounts.set(key, (opponentDuoCounts.get(key) ?? 0) + 1);
      }
    }

    const bp = [...partnerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const bo = [...opponentCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const bd = [...opponentDuoCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (bp) topPartner = { label: bp[0], count: bp[1] };
    if (bo) topOpponent = { label: bo[0], count: bo[1] };
    if (bd) topOpponentDuo = { label: bd[0], count: bd[1] };
  }

  // Stats FifaChamp par match
  let hasFifaStats = false;
  let avgButs = 0, avgJaunes = 0, avgRouges = 0;
  let avgBlessures = 0, avgRetournees = 0, avgCf = 0;
  if (mode === "fifachamp" && historyIds.length > 0) {
    let q = supabase
      .from("matches")
      .select("score_a, score_b, stats, match_participants(side, profile_id)")
      .eq("game_id", game.id)
      .in("id", historyIds);
    if (dateFrom) q = q.gte("played_at", dateFrom);
    const { data } = await q.returns<{ score_a: number | null; score_b: number | null; stats: Record<string, Record<string, number>> | null; match_participants: { side: "A" | "B"; profile_id: string | null }[] }[]>();
    const withStats = (data ?? []).filter((m) => m.stats != null);
    hasFifaStats = withStats.length > 0;
    if (withStats.length > 0) {
      let sb = 0, sj = 0, sr = 0, sbl = 0, sret = 0, scf = 0;
      for (const m of withStats) {
        const side = m.match_participants.find((p) => p.profile_id === userId)?.side;
        if (!side || !m.stats) continue;
        const s = m.stats[side.toLowerCase()] ?? {};
        sb   += (side === "A" ? m.score_a : m.score_b) ?? 0;
        sj   += s.cartons_jaunes   ?? 0;
        sr   += s.cartons_rouges   ?? 0;
        sbl  += s.sorties_blessure ?? 0;
        sret += s.retournees       ?? 0;
        scf  += s.coups_francs     ?? 0;
      }
      avgButs       = sb   / withStats.length;
      avgJaunes     = sj   / withStats.length;
      avgRouges     = sr   / withStats.length;
      avgBlessures  = sbl  / withStats.length;
      avgRetournees = sret / withStats.length;
      avgCf         = scf  / withStats.length;
    }
  }

  // Courbe Elo
  let globalHistory: HistoryRow[] = [];
  let v1History: HistoryRow[] = [];
  let hq = supabase
    .from("rating_history")
    .select("scope, rating, played_at")
    .eq("game_id", game.id)
    .eq("profile_id", userId)
    .order("played_at", { ascending: true });
  if (dateFrom) hq = hq.gte("played_at", dateFrom);
  const { data: hist } = await hq.returns<HistoryRow[]>();
  globalHistory = (hist ?? []).filter((h) => h.scope === "GLOBAL");
  v1History = (hist ?? []).filter((h) => h.scope === "1V1");

  const hasContent = hasFifaStats || globalHistory.length >= 2 || v1History.length >= 2 || !!topOpponent;
  if (!hasContent) return null;

  return (
    <>
      {hasFifaStats ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <MiniStat label="Buts / Match"       value={avgButs.toFixed(1)} />
            <MiniStat label="Jaunes / Match"     value={avgJaunes.toFixed(1)} />
            <MiniStat label="Rouges / Match"     value={avgRouges.toFixed(1)} />
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            <MiniStat label="Blessures / Match"  value={avgBlessures.toFixed(1)} />
            <MiniStat label="Retournées / Match" value={avgRetournees.toFixed(1)} />
            <MiniStat label="CF directs / Match" value={avgCf.toFixed(1)} />
          </div>
        </div>
      ) : null}
      {globalHistory.length >= 2 || v1History.length >= 2 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Évolution Elo
          </p>
          <EloChart
            globalPoints={globalHistory}
            v1Points={v1History}
          />
        </div>
      ) : null}
      {topOpponent ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <FreqStat label="Partenaire" tooltip="Le joueur avec lequel il a le plus joué pendant cette période" name={topPartner?.label ?? null} count={topPartner?.count ?? null} unit="matchs" />
            <FreqStat label="Rival" tooltip="Le joueur contre qui il a le plus joué pendant cette période" name={topOpponent.label} count={topOpponent.count} unit="confrontations" />
            <FreqStat label="Duo rival" tooltip="Le duo contre lequel il a le plus joué pendant cette période" name={topOpponentDuo?.label ?? null} count={topOpponentDuo?.count ?? null} unit="matchs" />
          </div>
        </div>
      ) : null}
    </>
  );
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function EloCard({ title, sub, rating, rank }: { title: string; sub?: string; rating?: number; rank: number | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight text-slate-700">{title}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      <p className="shrink-0 text-xl font-bold text-brand-700">
        {rating != null ? Math.round(rating) : "—"}
      </p>
      <p className="w-10 shrink-0 text-right text-sm font-medium text-slate-400">
        {rank != null ? `#${rank}` : "—"}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col items-center py-3">
      <span className="text-base font-bold text-slate-800">{value}</span>
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

function FreqStat({ label, tooltip, name, count, unit }: { label: string; tooltip: string; name: string | null; count: number | null; unit: string }) {
  return (
    <div className="flex flex-1 flex-col items-center px-2 py-3 text-center">
      <span className="flex items-center gap-0.5 text-[10px] uppercase tracking-wide text-slate-400">
        {label}
        <span className="relative inline-flex">
          <span className="peer cursor-help" tabIndex={0} aria-label={tooltip}>
            <svg className="size-3 text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-36 -translate-x-1/2 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus:opacity-100">
            {tooltip}
          </span>
        </span>
      </span>
      <span className="mt-1 line-clamp-2 text-xs font-semibold leading-tight text-slate-800">
        {name ?? "—"}
      </span>
      {count != null ? (
        <span className="mt-0.5 text-[11px] text-slate-400">{count} {unit}</span>
      ) : null}
    </div>
  );
}

const BRAND = "#2563eb";
const SLATE = "#94a3b8";

function chartPath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return "";
  if (xs.length === 1) return `M${xs[0]},${ys[0]}`;
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 1; i < xs.length; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2;
    d += ` C${cpx.toFixed(1)},${ys[i - 1].toFixed(1)} ${cpx.toFixed(1)},${ys[i].toFixed(1)} ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  }
  return d;
}

function EloChart({ globalPoints, v1Points }: { globalPoints: HistoryRow[]; v1Points: HistoryRow[] }) {
  const W = 300, H = 100, PX = 6, PY = 10;
  const allRatings = [...globalPoints, ...v1Points].map((p) => p.rating);
  if (allRatings.length === 0) return null;

  const minR = Math.min(...allRatings);
  const maxR = Math.max(...allRatings);
  const rangeR = maxR - minR < 20 ? 20 : maxR - minR;
  const toX = (i: number, total: number) => PX + (total <= 1 ? 0 : (i / (total - 1)) * (W - 2 * PX));
  const toY = (r: number) => H - PY - ((r - minR) / rangeR) * (H - 2 * PY);

  const gxs = globalPoints.map((_, i) => toX(i, globalPoints.length));
  const gys = globalPoints.map((p) => toY(p.rating));
  const vxs = v1Points.map((_, i) => toX(i, v1Points.length));
  const vys = v1Points.map((p) => toY(p.rating));
  const showBoth = globalPoints.length >= 2 && v1Points.length >= 2;

  return (
    <div>
      {showBoth ? (
        <div className="mb-2 flex gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: BRAND }} />
            Global
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: SLATE }} />
            1v1
          </span>
        </div>
      ) : null}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} aria-hidden="true">
        <line x1={PX} y1={toY(maxR)} x2={W - PX} y2={toY(maxR)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={PX} y1={toY(minR)} x2={W - PX} y2={toY(minR)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
        <text x={W - PX + 2} y={toY(maxR) + 4} fontSize="8" fill={SLATE} textAnchor="start">{Math.round(maxR)}</text>
        <text x={W - PX + 2} y={toY(minR) + 4} fontSize="8" fill={SLATE} textAnchor="start">{Math.round(minR)}</text>
        {v1Points.length >= 2 ? (
          <path d={chartPath(vxs, vys)} fill="none" stroke={SLATE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {globalPoints.length >= 2 ? (
          <path d={chartPath(gxs, gys)} fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {globalPoints.length >= 2 ? (
          <circle cx={gxs[gxs.length - 1]} cy={gys[gys.length - 1]} r="3" fill={BRAND} />
        ) : null}
        {v1Points.length >= 2 ? (
          <circle cx={vxs[vxs.length - 1]} cy={vys[vys.length - 1]} r="2.5" fill={SLATE} />
        ) : null}
      </svg>
    </div>
  );
}
