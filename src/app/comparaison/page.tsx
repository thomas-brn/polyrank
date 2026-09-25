import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { MatchCard } from "@/components/match-card";
import { MatchFormatTabs, type MatchFormat } from "@/components/match-format-tabs";
import { PeriodTabs, type Period } from "@/components/period-tabs";
import { EloCompareChart } from "@/components/elo-compare-chart";
import {
  StatRadar,
  RADAR_COLOR_A,
  RADAR_COLOR_B,
  type RadarAxis,
} from "@/components/stat-radar";
import { ANNEE_LABELS } from "@/lib/constants";
import { getMode, MODES, type Mode } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { NO_PLAYER } from "./constants";
import { PlayerPicker } from "./player-picker";
import {
  EloChartSkeleton,
  EloSkeleton,
  HeadToHeadSkeleton,
  StatsSkeleton,
} from "./skeletons";
import {
  fetchEloHistory,
  fetchHeadToHead,
  fetchPlayerElo,
  fetchPlayerIdentity,
  fetchPlayerStats,
  fetchStatMaxima,
  fetchTopPlayers,
  type ComparisonFilters,
  type PlayerElo,
  type PlayerIdentity,
} from "./query";

/** Nombre de confrontations listées sous le bilan. */
const H2H_PREVIEW = 10;

function toValidPeriod(raw: string | undefined): Period {
  return (["all", "season", "month", "week"] as const).includes(raw as Period)
    ? (raw as Period)
    : "all";
}

function toValidMatchFormat(raw: string | undefined): MatchFormat {
  const valid: MatchFormat[] = ["global", "1v1", "2v2"];
  return valid.includes(raw as MatchFormat) ? (raw as MatchFormat) : "global";
}

/** Complément de phrase pour les états vides (« ... cette saison »). */
function periodSuffix(period: Period): string {
  if (period === "season") return " cette saison";
  if (period === "month") return " sur les 30 derniers jours";
  if (period === "week") return " sur les 7 derniers jours";
  return "";
}

export default async function ComparaisonPage({
  searchParams,
}: {
  searchParams: Promise<{
    a?: string;
    b?: string;
    format?: string;
    period?: string;
  }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Comparaison" />
        <ComingSoon>Authentification non configurée (voir le README).</ComingSoon>
      </div>
    );
  }

  const { a, b, format: rawFormat, period: rawPeriod } = await searchParams;
  const mode = await getMode();
  const sport = MODES[mode].sport;
  const matchFormat = toValidMatchFormat(rawFormat);
  const period = toValidPeriod(rawPeriod);

  // Première visite sans joueur : on se met soi-même en joueur A, sans
  // rediriger. Une redirection coûterait un aller-retour complet renvoyé sans
  // corps, pendant lequel l'écran resterait vide (pas même les squelettes) ;
  // elle empêcherait aussi le préchargement de la route. Le sélecteur inscrit
  // l'id dans l'URL dès le premier choix, donc le lien reste partageable.
  // `a=none` = joueur A retiré explicitement : on ne remet pas le joueur
  // connecté par défaut.
  const clearedA = a === NO_PLAYER;
  let idA = clearedA ? undefined : a;
  if (!idA && !clearedA && !b) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    idA = user?.id;
  }

  const idB = b && b !== idA ? b : undefined;
  const [playerA, playerB, suggestions] = await Promise.all([
    idA ? fetchPlayerIdentity(idA) : Promise.resolve(null),
    idB ? fetchPlayerIdentity(idB) : Promise.resolve(null),
    fetchTopPlayers(mode),
  ]);

  const filters: ComparisonFilters = { mode, matchFormat, period };
  const bodyKey = `${mode}-${matchFormat}-${period}-${playerA?.id ?? ""}-${playerB?.id ?? ""}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        title="Comparaison"
        description={`Confronte deux joueurs ${sport} : Elo, stats et face-à-face.`}
      />

      <PlayerPicker
        playerA={toPicked(playerA)}
        playerB={toPicked(playerB)}
        suggestions={suggestions}
      />

      {!playerA || !playerB ? (
        <ComingSoon>
          Choisis deux joueurs pour comparer leurs Elo, leurs statistiques et
          leurs confrontations. Les champs proposent les mieux classés en{" "}
          {sport}{" "}tant que tu n&apos;as rien tapé.
        </ComingSoon>
      ) : (
        <>
          <MatchFormatTabs
            current={matchFormat}
            basePath="/comparaison"
            mode={mode}
          />
          <PeriodTabs
            current={period}
            basePath="/comparaison"
            preserve={["a", "b"]}
          />

          <Suspense key={`elo-${bodyKey}`} fallback={<EloSkeleton />}>
            <EloSection
              playerA={playerA}
              playerB={playerB}
              filters={filters}
              sport={sport}
            />
          </Suspense>

          <Suspense key={`chart-${bodyKey}`} fallback={<EloChartSkeleton />}>
            <EloChartSection
              playerA={playerA}
              playerB={playerB}
              filters={filters}
            />
          </Suspense>

          <Suspense key={`stats-${bodyKey}`} fallback={<StatsSkeleton />}>
            <StatsSection
              playerA={playerA}
              playerB={playerB}
              filters={filters}
              mode={mode}
              sport={sport}
            />
          </Suspense>

          <Suspense key={`h2h-${bodyKey}`} fallback={<HeadToHeadSkeleton />}>
            <HeadToHeadSection
              playerA={playerA}
              playerB={playerB}
              filters={filters}
              mode={mode}
              sport={sport}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}

function toPicked(player: PlayerIdentity | null) {
  return player
    ? { id: player.id, pseudo: player.pseudo, schoolName: player.schoolName }
    : null;
}

// ─── Elo ──────────────────────────────────────────────────────────────────────

async function EloSection({
  playerA,
  playerB,
  filters,
  sport,
}: {
  playerA: PlayerIdentity;
  playerB: PlayerIdentity;
  filters: ComparisonFilters;
  sport: string;
}) {
  const [eloA, eloB] = await Promise.all([
    fetchPlayerElo(playerA.id, filters),
    fetchPlayerElo(playerB.id, filters),
  ]);

  const delta =
    eloA.rating != null && eloB.rating != null
      ? Math.round(eloA.rating) - Math.round(eloB.rating)
      : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {eloA.label}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <EloSide player={playerA} elo={eloA} color={RADAR_COLOR_A} align="start" />
        <div className="flex flex-col items-center pt-8">
          {delta != null && delta !== 0 ? (
            <span
              className="flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold text-white"
              style={{
                backgroundColor: delta > 0 ? RADAR_COLOR_A : RADAR_COLOR_B,
              }}
            >
              {delta > 0 ? <ArrowLeft className="size-3" aria-hidden /> : null}
              {Math.abs(delta)}
              {delta < 0 ? <ArrowRight className="size-3" aria-hidden /> : null}
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-300">vs</span>
          )}
        </div>
        <EloSide player={playerB} elo={eloB} color={RADAR_COLOR_B} align="end" />
      </div>

      {eloA.rating == null || eloB.rating == null ? (
        <p className="mt-3 border-t border-slate-100 pt-2 text-center text-xs text-slate-400">
          {eloA.rating == null && eloB.rating == null
            ? `Aucun des deux n'a encore de classement ${sport} sur ce format.`
            : `${eloA.rating == null ? playerA.pseudo : playerB.pseudo} n'a pas encore de classement ${sport} sur ce format.`}
        </p>
      ) : null}
    </section>
  );
}

function EloSide({
  player,
  elo,
  color,
  align,
}: {
  player: PlayerIdentity;
  elo: PlayerElo;
  color: string;
  align: "start" | "end";
}) {
  const side =
    align === "start" ? "items-start text-left" : "items-end text-right";
  const details = [player.schoolName, player.annee ? ANNEE_LABELS[player.annee] : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`flex min-w-0 flex-col ${side}`}>
      <Link
        href={`/joueurs/${player.id}`}
        className="max-w-full truncate text-sm font-semibold text-slate-900 hover:underline"
      >
        {player.pseudo}
      </Link>
      <span className="max-w-full truncate text-[11px] text-slate-400">
        {details || "-"}
      </span>
      {elo.rating != null ? (
        <>
          <span className="mt-1 text-3xl font-bold tabular-nums" style={{ color }}>
            {Math.round(elo.rating)}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {elo.rank != null ? `#${elo.rank}` : "—"}
            {elo.record != null ? ` · record ${Math.round(elo.record)}` : ""}
          </span>
        </>
      ) : (
        <span className="mt-2 text-sm font-medium text-slate-300">
          Non classé
        </span>
      )}
      {elo.sub ? (
        <span className="max-w-full truncate text-[11px] text-slate-400">
          {elo.sub}
        </span>
      ) : null}
    </div>
  );
}

async function EloChartSection({
  playerA,
  playerB,
  filters,
}: {
  playerA: PlayerIdentity;
  playerB: PlayerIdentity;
  filters: ComparisonFilters;
}) {
  const [histA, histB] = await Promise.all([
    fetchEloHistory(playerA.id, filters),
    fetchEloHistory(playerB.id, filters),
  ]);

  if (histA.length < 2 && histB.length < 2) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Évolution Elo
      </p>
      <EloCompareChart
        series={[
          { name: playerA.pseudo, color: RADAR_COLOR_A, points: histA },
          { name: playerB.pseudo, color: RADAR_COLOR_B, points: histB },
        ]}
      />
    </section>
  );
}

// ─── Statistiques ─────────────────────────────────────────────────────────────

async function StatsSection({
  playerA,
  playerB,
  filters,
  mode,
  sport,
}: {
  playerA: PlayerIdentity;
  playerB: PlayerIdentity;
  filters: ComparisonFilters;
  mode: Mode;
  sport: string;
}) {
  const [statsA, statsB, maxima] = await Promise.all([
    fetchPlayerStats(playerA.id, filters),
    fetchPlayerStats(playerB.id, filters),
    mode === "fifachamp" ? fetchStatMaxima(filters) : Promise.resolve(null),
  ]);

  if (statsA.played === 0 && statsB.played === 0) {
    return (
      <section className="flex flex-col gap-3">
        <SectionTitle>Statistiques</SectionTitle>
        <ComingSoon>
          Ni {playerA.pseudo} ni {playerB.pseudo} n&apos;ont joué de match{" "}
          {sport}
          {filters.matchFormat === "global" ? "" : ` en ${filters.matchFormat}`}
          {periodSuffix(filters.period as Period)}.
        </ComingSoon>
      </section>
    );
  }

  const showDraws = statsA.draws > 0 || statsB.draws > 0;
  const fifaA = statsA.fifa;
  const fifaB = statsB.fifa;
  const showRadar = mode === "fifachamp" && fifaA != null && fifaB != null;

  const axes: RadarAxis[] = showRadar
    ? [
        radarAxis("Winrate", statsA.winrate ?? 0, statsB.winrate ?? 0, maxima?.winrate, percent),
        radarAxis("Buts", fifaA.buts, fifaB.buts, maxima?.buts),
        radarAxis("Rouges", fifaA.rouges, fifaB.rouges, maxima?.rouges),
        radarAxis("Jaunes", fifaA.jaunes, fifaB.jaunes, maxima?.jaunes),
        radarAxis("Blessures", fifaA.blessures, fifaB.blessures, maxima?.blessures, two),
        radarAxis("Retournées", fifaA.retournees, fifaB.retournees, maxima?.retournees, two),
        radarAxis("CF directs", fifaA.cf, fifaB.cf, maxima?.cf, two),
      ]
    : [];

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Statistiques</SectionTitle>

      {showRadar ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 pt-4">
          <StatRadar axes={axes} nameA={playerA.pseudo} nameB={playerB.pseudo} />
          <p className="mt-2 text-center text-[10px] leading-snug text-slate-400">
            {maxima
              ? "Le cercle extérieur porte le record du site sur cet axe, parmi les joueurs à plus de 10 matchs."
              : "Chaque axe est ramené au meilleur des deux joueurs."}
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-100 px-3 py-2">
          <span
            className="truncate text-xs font-semibold"
            style={{ color: RADAR_COLOR_A }}
          >
            {playerA.pseudo}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-slate-300">
            vs
          </span>
          <span
            className="truncate text-right text-xs font-semibold"
            style={{ color: RADAR_COLOR_B }}
          >
            {playerB.pseudo}
          </span>
        </div>
        <CompareRow label="Matchs" a={statsA.played} b={statsB.played} />
        <CompareRow label="Victoires" a={statsA.wins} b={statsB.wins} />
        {showDraws ? (
          <CompareRow label="Nuls" a={statsA.draws} b={statsB.draws} />
        ) : null}
        <CompareRow label="Défaites" a={statsA.losses} b={statsB.losses} />
        <CompareRow
          label="% de victoires"
          a={statsA.winrate}
          b={statsB.winrate}
          format={percent}
        />
        {fifaA && fifaB ? (
          <>
            <CompareRow label="Buts / match" a={fifaA.buts} b={fifaB.buts} format={one} />
            <CompareRow label="Jaunes / match" a={fifaA.jaunes} b={fifaB.jaunes} format={one} />
            <CompareRow label="Rouges / match" a={fifaA.rouges} b={fifaB.rouges} format={one} />
            <CompareRow label="Blessures / match" a={fifaA.blessures} b={fifaB.blessures} format={two} />
            <CompareRow label="Retournées / match" a={fifaA.retournees} b={fifaB.retournees} format={two} />
            <CompareRow label="CF directs / match" a={fifaA.cf} b={fifaB.cf} format={two} />
          </>
        ) : null}
      </div>
    </section>
  );
}

const one = (v: number) => v.toFixed(1);
/** Les stats rares (blessures, retournées, coups francs) sont souvent < 0,1. */
const two = (v: number) => v.toFixed(2);
const percent = (v: number) => `${v}%`;

function radarAxis(
  label: string,
  a: number,
  b: number,
  max?: number,
  format: (v: number) => string = one,
): RadarAxis {
  return { label, a, b, max, aLabel: format(a), bLabel: format(b) };
}

function CompareRow({
  label,
  a,
  b,
  format = (v: number) => String(v),
}: {
  label: string;
  a: number | null;
  b: number | null;
  format?: (v: number) => string;
}) {
  const aLeads = a != null && b != null && a > b;
  const bLeads = a != null && b != null && b > a;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-b-0">
      <span
        className={`text-sm tabular-nums ${aLeads ? "font-bold" : "font-medium text-slate-500"}`}
        style={aLeads ? { color: RADAR_COLOR_A } : undefined}
      >
        {a != null ? format(a) : "—"}
      </span>
      <span className="text-center text-[11px] text-slate-400">{label}</span>
      <span
        className={`text-right text-sm tabular-nums ${bLeads ? "font-bold" : "font-medium text-slate-500"}`}
        style={bLeads ? { color: RADAR_COLOR_B } : undefined}
      >
        {b != null ? format(b) : "—"}
      </span>
    </div>
  );
}

// ─── Face-à-face ──────────────────────────────────────────────────────────────

async function HeadToHeadSection({
  playerA,
  playerB,
  filters,
  mode,
  sport,
}: {
  playerA: PlayerIdentity;
  playerB: PlayerIdentity;
  filters: ComparisonFilters;
  mode: Mode;
  sport: string;
}) {
  const h2h = await fetchHeadToHead(playerA.id, playerB.id, filters, H2H_PREVIEW);
  const hidden = h2h.versusPlayed - h2h.versus.length;

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Face-à-face</SectionTitle>

      {h2h.versusPlayed === 0 ? (
        <ComingSoon>
          {playerA.pseudo} et {playerB.pseudo} ne se sont jamais affrontés en{" "}
          {sport}
          {periodSuffix(filters.period as Period)}.
          {h2h.togetherPlayed > 0
            ? ` En revanche ils ont joué ${h2h.togetherPlayed} match${h2h.togetherPlayed > 1 ? "s" : ""} dans la même équipe.`
            : ""}
        </ComingSoon>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-center gap-3">
              <span
                className="text-3xl font-bold tabular-nums"
                style={{ color: RADAR_COLOR_A }}
              >
                {h2h.versusWinsA}
              </span>
              <span className="text-lg font-semibold text-slate-300">-</span>
              {h2h.versusDraws > 0 ? (
                <>
                  <span className="text-3xl font-bold tabular-nums text-slate-400">
                    {h2h.versusDraws}
                  </span>
                  <span className="text-lg font-semibold text-slate-300">-</span>
                </>
              ) : null}
              <span
                className="text-3xl font-bold tabular-nums"
                style={{ color: RADAR_COLOR_B }}
              >
                {h2h.versusWinsB}
              </span>
            </div>
            <p className="mt-1 text-center text-xs text-slate-400">
              {`${h2h.versusPlayed} confrontation${h2h.versusPlayed > 1 ? "s" : ""}`}
              {h2h.versusDraws > 0 ? " (victoires, nuls, victoires)" : ""}
            </p>
            {h2h.goalsA + h2h.goalsB > 0 ? (
              <p className="mt-1 text-center text-xs text-slate-400">
                {`Buts cumulés : ${h2h.goalsA} - ${h2h.goalsB}`}
              </p>
            ) : null}
            {h2h.togetherPlayed > 0 ? (
              <p className="mt-2 border-t border-slate-100 pt-2 text-center text-xs text-slate-500">
                {`Ensemble : ${h2h.togetherPlayed} match${h2h.togetherPlayed > 1 ? "s" : ""}, ${h2h.togetherWins} victoire${h2h.togetherWins > 1 ? "s" : ""}`}
              </p>
            ) : null}
          </div>

          <ul className="flex flex-col gap-3">
            {h2h.versus.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                mode={mode}
                leftSide={
                  match.match_participants.find(
                    (p) => p.profile_id === playerA.id,
                  )?.side ?? "A"
                }
              />
            ))}
          </ul>

          {hidden > 0 ? (
            <Link
              href={`/joueurs/${playerA.id}`}
              className="text-center text-xs text-slate-400 hover:text-slate-600"
            >
              {`+ ${hidden} confrontation${hidden > 1 ? "s" : ""} plus ancienne${hidden > 1 ? "s" : ""}`}
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 ml-2 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </p>
  );
}
