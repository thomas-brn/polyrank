import { Suspense } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { ProfileSettingsMenu } from "@/components/profile-settings-menu";
import { type MatchData } from "@/components/match-card";
import { MatchHistoryList } from "@/components/match-history-list";
import { PeriodTabs, type Period } from "@/components/period-tabs";
import { MatchFormatTabs, type MatchFormat } from "@/components/match-format-tabs";
import { DuoPartnerSelect } from "@/components/duo-partner-select";
import { EloChart, type DuoSeries } from "@/components/elo-chart";
import { ANNEE_LABELS } from "@/lib/constants";
import { getMode, MODES, type Mode } from "@/lib/mode";
import { getDateFrom } from "@/lib/period";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MATCH_SELECT =
  "id, format, status, is_friendly, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

type ProfileRow = { pseudo: string | null; annee: string | null; schools: { name: string } | null };
type RatingRow = { scope: string; rating: number; played: number; won: number; lost: number };
type HistoryRow = { scope: string; rating: number; played_at: string };
type DuoHistoryRow = { profile_lo: string; profile_hi: string; rating: number; played_at: string };
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

function toValidMatchFormat(raw: string | undefined, mode: Mode): MatchFormat {
  const valid: MatchFormat[] = ["global", "1v1", "2v2"];
  return valid.includes(raw as MatchFormat) ? (raw as MatchFormat) : "global";
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

// ─── Page principale ──────────────────────────────────────────────────────────

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; duo?: string; format?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Mon profil" />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Authentification non configurée (voir le README).
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <PageHeader title="Mon profil" />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            Connecte-toi ou crée un compte pour accéder à ton profil.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/login"
              className="inline-flex rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo, annee, schools(name)")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (!profile?.pseudo) {
    return (
      <div>
        <PageHeader title="Mon profil" subtitle={user.email ?? undefined} />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Ton profil n&apos;est pas encore complet.</p>
          <Link
            href="/inscription"
            className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Compléter mon profil
          </Link>
        </div>
      </div>
    );
  }

  const { period: rawPeriod, duo: duoPartnerId, format: rawFormat } = await searchParams;
  const period = toValidPeriod(rawPeriod);
  const mode = await getMode();
  const matchFormat = toValidMatchFormat(rawFormat, mode);
  const ecoleLabel = profile.schools?.name ?? "-";
  const anneeLabel = profile.annee ? ANNEE_LABELS[profile.annee] : null;

  // Quand un partenaire duo est sélectionné sur le tab 2v2, calculer les matchs joués ensemble
  let duoMatchIds: string[] | null = null;
  if (matchFormat === "2v2" && duoPartnerId) {
    const [{ data: userParts }, { data: partnerParts }] = await Promise.all([
      supabase.from("match_participants").select("match_id, side").eq("profile_id", user.id),
      supabase.from("match_participants").select("match_id, side").eq("profile_id", duoPartnerId),
    ]);
    const partnerSideMap = new Map<string, string>(
      (partnerParts ?? []).map((p) => [p.match_id, p.side]),
    );
    duoMatchIds = (userParts ?? [])
      .filter((up) => partnerSideMap.get(up.match_id) === up.side)
      .map((up) => up.match_id);
  }

  // Clé Suspense pour EloSection : se recharge si format ou partenaire duo change
  const eloKey = `${matchFormat}-${matchFormat === "2v2" ? (duoPartnerId ?? "best") : ""}`;
  // Clé pour les stats et l'historique : inclut aussi le partenaire sélectionné
  const statsKey = `${period}-${matchFormat}-${matchFormat === "2v2" ? (duoPartnerId ?? "") : ""}`;

  return (
    <div>
      {/* Hero */}
      <div className="mb-2">
        <PageHero
          title={profile.pseudo}
          description={user.email ?? undefined}
          topRightAction={<ProfileSettingsMenu variant="icon" />}
        >
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
          <div className="hidden md:mt-4 md:block">
            <ProfileSettingsMenu variant="wide" />
          </div>
        </PageHero>
      </div>

      {/* Onglets format */}
      <MatchFormatTabs current={matchFormat} basePath="/profil" mode={mode} />

      {/* Sélecteur de partenaire duo */}
      {matchFormat === "2v2" && (
        <Suspense fallback={<div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" />}>
          <DuoSelectSection userId={user.id} mode={mode} selectedPartnerId={duoPartnerId} />
        </Suspense>
      )}

      {/* Classement ELO */}
      <Suspense key={eloKey} fallback={<EloSkeleton />}>
        <EloSection
          userId={user.id}
          mode={mode}
          matchFormat={matchFormat}
          duoPartnerId={duoPartnerId}
        />
      </Suspense>

      <p className="mt-6 mb-2 ml-2 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
        Statistiques
      </p>

      {/* Onglets période */}
      <PeriodTabs current={period} basePath="/profil" />

      {/* Stats principales + détaillées */}
      <div className="mt-3 flex flex-col gap-3">
        <Suspense key={statsKey} fallback={<StatsSpinner />}>
          <PeriodStats userId={user.id} period={period} mode={mode} matchFormat={matchFormat} duoMatchIds={duoMatchIds} />
        </Suspense>

        <details className="group flex flex-col gap-3">
          <div className="order-1 flex flex-col gap-3">
            <Suspense key={statsKey} fallback={<DetailedStatsSpinner />}>
              <DetailedStats userId={user.id} period={period} mode={mode} matchFormat={matchFormat} duoMatchIds={duoMatchIds} duoPartnerId={duoPartnerId} />
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

      {/* Historique des matchs */}
      <Suspense key={`history-${statsKey}`} fallback={<MatchHistorySpinner />}>
        <MatchHistory userId={user.id} period={period} mode={mode} matchFormat={matchFormat} duoMatchIds={duoMatchIds} />
      </Suspense>
    </div>
  );
}

// ─── ELO ─────────────────────────────────────────────────────────────────────

async function EloSection({
  userId,
  mode,
  matchFormat,
  duoPartnerId,
}: {
  userId: string;
  mode: Mode;
  matchFormat: MatchFormat;
  duoPartnerId?: string;
}) {
  const supabase = await createClient();
  const sport = MODES[mode].sport;

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  if (!game) return null;

  // ── Global ────────────────────────────────────────────────────────────────
  if (matchFormat === "global") {
    const { data: prs } = await supabase
      .from("player_ratings")
      .select("scope, rating, played, won, lost")
      .eq("game_id", game.id)
      .eq("profile_id", userId)
      .eq("scope", "GLOBAL")
      .returns<RatingRow[]>();
    const eloGlobal = prs?.[0] ?? null;
    if (!eloGlobal) return null;
    const rank = await rankOf(supabase, game.id, "GLOBAL", eloGlobal.rating);
    return (
      <div className="mt-6">
        <EloCard title={`Elo Global`} rating={eloGlobal.rating} rank={rank} />
      </div>
    );
  }

  // ── 1v1 ───────────────────────────────────────────────────────────────────
  if (matchFormat === "1v1") {
    const { data: prs } = await supabase
      .from("player_ratings")
      .select("scope, rating, played, won, lost")
      .eq("game_id", game.id)
      .eq("profile_id", userId)
      .eq("scope", "1V1")
      .returns<RatingRow[]>();
    const elo1v1 = prs?.[0] ?? null;
    if (!elo1v1) return null;
    const rank = await rankOf(supabase, game.id, "1V1", elo1v1.rating);
    return (
      <div className="mt-6">
        <EloCard title={`Elo 1v1`} rating={elo1v1.rating} rank={rank} />
      </div>
    );
  }

  // ── 2v2 ───────────────────────────────────────────────────────────────────
  const { data: allDuos } = await supabase
    .from("duo_ratings")
    .select("profile_lo, profile_hi, rating")
    .eq("game_id", game.id)
    .or(`profile_lo.eq.${userId},profile_hi.eq.${userId}`)
    .order("rating", { ascending: false })
    .returns<{ profile_lo: string; profile_hi: string; rating: number }[]>();

  if (!allDuos || allDuos.length === 0) return null;

  const partnerIds = allDuos.map((d) => (d.profile_lo === userId ? d.profile_hi : d.profile_lo));
  const uniquePartnerIds = [...new Set(partnerIds)];
  const { data: partnerProfiles } = await supabase
    .from("profiles")
    .select("id, pseudo")
    .in("id", uniquePartnerIds)
    .returns<{ id: string; pseudo: string | null }[]>();
  const pseudoMap = Object.fromEntries((partnerProfiles ?? []).map((p) => [p.id, p.pseudo ?? "?"]));

  const duoPartners = allDuos.map((d) => {
    const pid = d.profile_lo === userId ? d.profile_hi : d.profile_lo;
    return { id: pid, pseudo: pseudoMap[pid] ?? "?", rating: d.rating };
  });

  const targetPartnerId = duoPartnerId && uniquePartnerIds.includes(duoPartnerId) ? duoPartnerId : null;
  const chosenDuo = targetPartnerId
    ? allDuos.find((d) => d.profile_lo === targetPartnerId || d.profile_hi === targetPartnerId) ?? allDuos[0]
    : allDuos[0];
  const partnerId = chosenDuo.profile_lo === userId ? chosenDuo.profile_hi : chosenDuo.profile_lo;
  const selectedDuo = { rating: chosenDuo.rating, partnerName: pseudoMap[partnerId] ?? "?", partnerId };

  const { count } = await supabase
    .from("duo_ratings")
    .select("*", { count: "exact", head: true })
    .eq("game_id", game.id)
    .gt("rating", chosenDuo.rating);
  const rankDuo = (count ?? 0) + 1;

  return (
    <div className="mt-6">
      <EloCard title={`Elo 2v2`} sub={`avec ${selectedDuo.partnerName}`} rating={selectedDuo.rating} rank={rankDuo} />
    </div>
  );
}

async function DuoSelectSection({
  userId,
  mode,
  selectedPartnerId,
}: {
  userId: string;
  mode: Mode;
  selectedPartnerId?: string;
}) {
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();
  if (!game) return null;

  const { data: allDuos } = await supabase
    .from("duo_ratings")
    .select("profile_lo, profile_hi, rating")
    .eq("game_id", game.id)
    .or(`profile_lo.eq.${userId},profile_hi.eq.${userId}`)
    .order("rating", { ascending: false })
    .returns<{ profile_lo: string; profile_hi: string; rating: number }[]>();

  if (!allDuos || allDuos.length === 0) return null;

  const partnerIds = allDuos.map((d) => (d.profile_lo === userId ? d.profile_hi : d.profile_lo));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, pseudo")
    .in("id", partnerIds)
    .returns<{ id: string; pseudo: string | null }[]>();
  const pseudoMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.pseudo ?? "?"]));

  const partners = allDuos.map((d) => {
    const pid = d.profile_lo === userId ? d.profile_hi : d.profile_lo;
    return { id: pid, pseudo: pseudoMap[pid] ?? "?", rating: d.rating };
  });

  return <DuoPartnerSelect partners={partners} selectedPartnerId={selectedPartnerId} />;
}

function EloSkeleton() {
  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-5">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
      <div className="h-10 w-16 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-8 animate-pulse rounded bg-slate-100" />
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
  matchFormat,
  duoMatchIds,
}: {
  userId: string;
  period: Period;
  mode: Mode;
  matchFormat: MatchFormat;
  duoMatchIds: string[] | null;
}) {
  const supabase = await createClient();
  const dateFrom = getDateFrom(period);

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  let historyIds: string[];
  if (duoMatchIds !== null) {
    historyIds = duoMatchIds;
  } else {
    const { data: parts } = await supabase
      .from("match_participants")
      .select("match_id")
      .eq("profile_id", userId);
    historyIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);
  }

  let periodData: MatchStat[] = [];
  if (historyIds.length > 0 && game) {
    let q = supabase
      .from("matches")
      .select("winner_side, stats, match_participants(side, profile_id)")
      .eq("game_id", game.id)
      .in("id", historyIds);
    if (matchFormat === "1v1") q = q.eq("format", "1V1");
    if (matchFormat === "2v2") q = q.eq("format", "2V2");
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
  matchFormat,
  duoMatchIds,
}: {
  userId: string;
  period: Period;
  mode: Mode;
  matchFormat: MatchFormat;
  duoMatchIds: string[] | null;
}) {
  const supabase = await createClient();
  const dateFrom = getDateFrom(period);
  const sport = MODES[mode].sport;

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  let historyIds: string[];
  if (duoMatchIds !== null) {
    historyIds = duoMatchIds;
  } else {
    const { data: parts } = await supabase
      .from("match_participants")
      .select("match_id")
      .eq("profile_id", userId);
    historyIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);
  }

  let raw: MatchData[] = [];
  if (historyIds.length > 0 && game) {
    let mq = supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("game_id", game.id)
      .in("id", historyIds)
      .order("status", { ascending: true })
      .order("played_at", { ascending: false })
      .range(0, 20);
    if (matchFormat === "1v1") mq = mq.eq("format", "1V1");
    if (matchFormat === "2v2") mq = mq.eq("format", "2V2");
    if (dateFrom) mq = mq.gte("played_at", dateFrom);
    const { data } = await mq.returns<MatchData[]>();
    raw = data ?? [];
  }

  const hasMore = raw.length > 20;
  const initialMatches = hasMore ? raw.slice(0, 20) : raw;
  const formatLabel = matchFormat === "1v1" ? "1v1" : matchFormat === "2v2" ? "2v2" : "";

  return (
    <section>
      <p className="mt-6 mb-2 ml-2 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
        Mes matchs {formatLabel ? `${formatLabel} de ` : "de "}{sport}
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

// ─── Stats détaillées ─────────────────────────────────────────────────────────

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
  matchFormat,
  duoMatchIds,
  duoPartnerId,
}: {
  userId: string;
  period: Period;
  mode: Mode;
  matchFormat: MatchFormat;
  duoMatchIds: string[] | null;
  duoPartnerId?: string;
}) {
  const supabase = await createClient();
  const dateFrom = getDateFrom(period);

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();

  if (!game) return null;

  let historyIds: string[];
  if (duoMatchIds !== null) {
    historyIds = duoMatchIds;
  } else {
    const { data: parts } = await supabase
      .from("match_participants")
      .select("match_id")
      .eq("profile_id", userId);
    historyIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);
  }

  // ── FIFA stats ────────────────────────────────────────────────────────────
  let hasFifaStats = false;
  let avgButs = 0, avgJaunes = 0, avgRouges = 0;
  let avgBlessures = 0, avgRetournees = 0, avgCf = 0;
  if (mode === "fifachamp" && historyIds.length > 0) {
    let q = supabase
      .from("matches")
      .select("score_a, score_b, stats, match_participants(side, profile_id)")
      .eq("game_id", game.id)
      .in("id", historyIds);
    if (matchFormat === "1v1") q = q.eq("format", "1V1");
    if (matchFormat === "2v2") q = q.eq("format", "2V2");
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

  // ── Partenaires / adversaires ─────────────────────────────────────────────
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
    if (matchFormat === "1v1") pmq = pmq.eq("format", "1V1");
    if (matchFormat === "2v2") pmq = pmq.eq("format", "2V2");
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

  // ── Courbe Elo ────────────────────────────────────────────────────────────
  let globalHistory: HistoryRow[] = [];
  let v1History: HistoryRow[] = [];
  const duoSeries: DuoSeries[] = [];

  // Fetch uniquement l'historique pertinent pour le tab actif
  if (matchFormat === "global" || matchFormat === "1v1") {
    const scope = matchFormat === "1v1" ? "1V1" : "GLOBAL";
    let hq = supabase
      .from("rating_history")
      .select("scope, rating, played_at")
      .eq("game_id", game.id)
      .eq("profile_id", userId)
      .eq("scope", scope)
      .order("played_at", { ascending: true });
    if (dateFrom) hq = hq.gte("played_at", dateFrom);
    const { data: hist } = await hq.returns<HistoryRow[]>();
    if (matchFormat === "global") globalHistory = hist ?? [];
    else v1History = hist ?? [];
  }

  if (matchFormat === "2v2" && duoPartnerId) {
    let dhq = supabase
      .from("duo_rating_history")
      .select("profile_lo, profile_hi, rating, played_at")
      .eq("game_id", game.id)
      .or(`profile_lo.eq.${userId},profile_hi.eq.${userId}`)
      .order("played_at", { ascending: true });
    if (dateFrom) dhq = dhq.gte("played_at", dateFrom);
    const { data: duoHist } = await dhq.returns<DuoHistoryRow[]>();

    const points = (duoHist ?? [])
      .filter((row) => row.profile_lo === duoPartnerId || row.profile_hi === duoPartnerId)
      .map((row) => ({ rating: row.rating, played_at: row.played_at }));

    if (points.length >= 2) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("pseudo")
        .eq("id", duoPartnerId)
        .single<{ pseudo: string | null }>();
      duoSeries.push({
        partnerName: partnerProfile?.pseudo ?? "?",
        partnerId: duoPartnerId,
        points,
      });
    }
  }

  const hasChart =
    globalHistory.length >= 2 || v1History.length >= 2 || duoSeries.length > 0;
  const showEmptyDuoChart = matchFormat === "2v2" && !duoPartnerId;

  if (!hasFifaStats && !hasChart && !topOpponent && !showEmptyDuoChart) return null;

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
      {topOpponent ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <FreqStat label="Partenaire" tooltip="Le joueur avec lequel tu as le plus joué pendant cette période" name={topPartner?.label ?? null} count={topPartner?.count ?? null} unit="matchs" />
            <FreqStat label="Rival" tooltip="Le joueur contre qui tu as le plus joué pendant cette période" name={topOpponent.label} count={topOpponent.count} unit="confrontations" />
            <FreqStat label="Duo rival" tooltip="Le duo contre lequel tu as le plus joué pendant cette période" name={topOpponentDuo?.label ?? null} count={topOpponentDuo?.count ?? null} unit="matchs" />
          </div>
        </div>
      ) : null}
      {showEmptyDuoChart ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Évolution Elo
          </p>
          <div className="flex h-[110px] items-center justify-center">
            <p className="text-sm text-slate-400">Sélectionne un duo pour voir l'évolution</p>
          </div>
        </div>
      ) : hasChart ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Évolution Elo
          </p>
          <EloChart
            globalPoints={globalHistory}
            v1Points={v1History}
            duoSeries={duoSeries}
          />
        </div>
      ) : null}
    </>
  );
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function EloCard({ title, sub, rating, rank }: { title: string; sub?: string; rating?: number; rank: number | null }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-4 py-5 text-center">
      <p className="text-sm font-medium leading-tight text-slate-700">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      <p className="mt-2 text-4xl font-bold tabular-nums text-brand-700">
        {rating != null ? Math.round(rating) : "—"}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-400">
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
