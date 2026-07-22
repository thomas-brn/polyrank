import { Suspense } from "react";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { MatchCard, type MatchData } from "@/components/match-card";
import { MatchFormatTabs, type MatchFormat } from "@/components/match-format-tabs";
import { SchoolPromoFilters } from "@/components/school-promo-filters";
import { getMode, MODES, type Mode } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getGameId, getSchools } from "@/lib/supabase/queries";

const MATCH_SELECT =
  "id, format, status, is_friendly, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

function toValidMatchFormat(raw: string | undefined, mode: Mode): MatchFormat {
  const valid: MatchFormat[] = ["global", "1v1", "2v2"];
  return valid.includes(raw as MatchFormat) ? (raw as MatchFormat) : "global";
}

export default async function MatchsPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; school?: string; annee?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Historique" />
        <ComingSoon>Authentification non configurée (voir le README).</ComingSoon>
      </div>
    );
  }

  const mode = await getMode();
  const sport = MODES[mode].sport;

  const { format: rawFormat, school: schoolSlug, annee } = await searchParams;
  const matchFormat = toValidMatchFormat(rawFormat, mode);

  // Clé de suspense : re-suspend (affiche le squelette) à chaque changement de
  // format ou de filtre, sans bloquer l'affichage de l'en-tête / des onglets.
  const bodyKey = `${matchFormat}-${schoolSlug ?? ""}-${annee ?? ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <PageHero
          title={`Historique ${sport}`}
          description={`Tous les matchs de ${sport} joués.`}
        />
        <MatchFormatTabs current={matchFormat} basePath="/matchs" mode={mode} />
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <FiltersBar />
      </Suspense>

      <Suspense key={bodyKey} fallback={<MatchesSkeleton />}>
        <MatchesBody
          mode={mode}
          matchFormat={matchFormat}
          schoolSlug={schoolSlug}
          annee={annee}
        />
      </Suspense>
    </div>
  );
}

// ─── Barre de filtres (streamée) ───────────────────────────────────────────────

async function FiltersBar() {
  const schools = await getSchools();
  return <SchoolPromoFilters schools={schools} basePath="/matchs" />;
}

// ─── Liste des matchs (streamée) ───────────────────────────────────────────────

async function MatchesBody({
  mode,
  matchFormat,
  schoolSlug,
  annee,
}: {
  mode: Mode;
  matchFormat: MatchFormat;
  schoolSlug?: string;
  annee?: string;
}) {
  const supabase = await createClient();
  const sport = MODES[mode].sport;

  const gameId = (await getGameId(mode)) ?? "";

  // Résout school_id pour filtrage
  let filterSchoolId: string | null = null;
  if (schoolSlug) {
    const schools = await getSchools();
    filterSchoolId = schools.find((s) => s.slug === schoolSlug)?.id ?? null;
  }

  let matches: MatchData[] = [];
  if (gameId) {
    if (filterSchoolId || annee) {
      let pq = supabase
        .from("profiles")
        .select("id")
        .not("pseudo", "is", null);
      if (filterSchoolId) pq = pq.eq("school_id", filterSchoolId);
      if (annee) pq = pq.eq("annee", annee);
      const { data: pdata } = await pq.returns<{ id: string }[]>();
      const pids = (pdata ?? []).map((p) => p.id);

      if (pids.length > 0) {
        const { data: parts } = await supabase
          .from("match_participants")
          .select("match_id")
          .in("profile_id", pids)
          .returns<{ match_id: string }[]>();
        const matchIds = [...new Set((parts ?? []).map((p) => p.match_id))];

        if (matchIds.length > 0) {
          let mq = supabase
            .from("matches")
            .select(MATCH_SELECT)
            .eq("game_id", gameId)
            .eq("status", "VALIDE")
            .in("id", matchIds)
            .order("played_at", { ascending: false })
            .limit(50);
          if (matchFormat === "1v1") mq = mq.eq("format", "1V1");
          if (matchFormat === "2v2") mq = mq.eq("format", "2V2");
          const { data } = await mq.returns<MatchData[]>();
          matches = data ?? [];
        }
      }
    } else {
      let mq = supabase
        .from("matches")
        .select(MATCH_SELECT)
        .eq("game_id", gameId)
        .eq("status", "VALIDE")
        .order("played_at", { ascending: false })
        .limit(50);
      if (matchFormat === "1v1") mq = mq.eq("format", "1V1");
      if (matchFormat === "2v2") mq = mq.eq("format", "2V2");
      const { data } = await mq.returns<MatchData[]>();
      matches = data ?? [];
    }
  }

  if (matches.length === 0) {
    return (
      <ComingSoon>
        Aucun match {sport} pour l&apos;instant. Sois le premier à en saisir un !
      </ComingSoon>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {matches.map((match) => {
        const leftSide = match.match_participants.find((p) => p.is_creator)?.side ?? "A";
        return <MatchCard key={match.id} match={match} mode={mode} leftSide={leftSide} from="matchs" />;
      })}
    </ul>
  );
}

// ─── Squelettes de chargement ──────────────────────────────────────────────────

function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="h-7 w-32 animate-pulse rounded-md bg-slate-100" />
      <div className="h-7 w-28 animate-pulse rounded-md bg-slate-100" />
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i}>
          <div className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-white" />
        </li>
      ))}
    </ul>
  );
}
