import { Suspense } from "react";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { MatchFormatTabs, type MatchFormat } from "@/components/match-format-tabs";
import { MatchsHistoryList } from "@/components/matchs-history-list";
import { SchoolPromoFilters } from "@/components/school-promo-filters";
import { getMode, MODES, type Mode } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSchools } from "@/lib/supabase/queries";
import { fetchMatchsPage, type MatchsFilters } from "./query";

const PAGE_SIZE = 20;

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
  const sport = MODES[mode].sport;
  const filters: MatchsFilters = { mode, matchFormat, schoolSlug, annee };

  // On demande PAGE_SIZE + 1 lignes : la ligne sonde indique s'il reste des
  // matchs après la première page, sans être affichée.
  const raw = await fetchMatchsPage(filters, 0, PAGE_SIZE);
  const hasMore = raw.length > PAGE_SIZE;
  const initialMatches = raw.slice(0, PAGE_SIZE);

  if (initialMatches.length === 0) {
    return (
      <ComingSoon>
        Aucun match {sport} pour l&apos;instant. Sois le premier à en saisir un !
      </ComingSoon>
    );
  }

  return (
    <MatchsHistoryList initialMatches={initialMatches} filters={filters} hasMore={hasMore} />
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
