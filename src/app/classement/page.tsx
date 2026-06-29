import { Suspense } from "react";
import Link from "next/link";

import { ComingSoon } from "@/components/page-header";
import { EloOverlay } from "@/components/elo-overlay";
import { PageHero } from "@/components/page-hero";
import { SchoolPromoFilters } from "@/components/school-promo-filters";
import { getMode, MODES, type Mode } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_MIN = 5;

// Poids pour le classement des villes (identique à CFG.WEIGHTS du Google Sheet)
const WEIGHTS = { global: 1, v1: 1, v2: 1 };

type Scope = "GLOBAL" | "1V1" | "2V2" | "VILLES";

const SCOPES_BY_MODE: Record<Mode, { scope: Scope; label: string }[]> = {
  fifachamp: [
    { scope: "GLOBAL", label: "Général" },
    { scope: "1V1", label: "1v1" },
    { scope: "2V2", label: "2v2" },
    { scope: "VILLES", label: "Villes" },
  ],
  coincoin: [
    { scope: "GLOBAL", label: "Joueurs" },
    { scope: "2V2", label: "2v2" },
    { scope: "VILLES", label: "Villes" },
  ],
};

type ProfileLite = {
  id: string;
  pseudo: string | null;
  annee: string | null;
  school_slug: string | null;
  school_name: string | null;
  school_color: string | null;
};

type Row = {
  key: string;
  rank: number;
  rating: number;
  played: number;
  won: number;
  lost: number;
  players: { id: string | null; name: string; color: string | null }[];
  school: string | null;
};

type VilleRow = {
  ville: string;
  color: string | null;
  eloGlobal: number;
  elo1v1: number;
  elo2v2: number;
  eloPondere: number;
};

function rankBadge(rank: number): string {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
}

function sumTop5(arr: number[]): number {
  return arr
    .slice()
    .sort((a, b) => b - a)
    .slice(0, 5)
    .reduce((s, x) => s + x, 0);
}

export default async function ClassementPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; all?: string; school?: string; annee?: string }>;
}) {
  const mode = await getMode();
  const sport = MODES[mode].sport;
  const tabs = SCOPES_BY_MODE[mode];
  const { scope: scopeParam, all, school: schoolSlug, annee } = await searchParams;

  const scope: Scope =
    tabs.find((t) => t.scope === scopeParam?.toUpperCase())?.scope ?? tabs[0].scope;
  const showAll = all === "1";
  const min = showAll ? 1 : DEFAULT_MIN;

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero title={`Classement ${sport}`} description="Le top des joueurs." />
        <ComingSoon>Authentification non configurée (voir le README).</ComingSoon>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: game }, { data: schoolsData }] = await Promise.all([
    supabase.from("games").select("id").eq("slug", mode).single<{ id: string }>(),
    supabase.from("schools").select("id, name, slug, color").order("name"),
  ]);

  const schools = (schoolsData ?? []) as {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  }[];
  const schoolColorByName = new Map(schools.map((s) => [s.name, s.color]));

  // Résout le school_id à partir du slug si filtrage actif
  let filterSchoolId: string | null = null;
  if (schoolSlug) {
    filterSchoolId = schools.find((s) => s.slug === schoolSlug)?.id ?? null;
  }

  const tabHref = (s: Scope) => {
    const params = new URLSearchParams();
    if (s !== tabs[0].scope) params.set("scope", s.toLowerCase());
    if (showAll) params.set("all", "1");
    if (schoolSlug && s !== "VILLES") params.set("school", schoolSlug);
    if (annee && schoolSlug && s !== "VILLES") params.set("annee", annee);
    const qs = params.toString();
    return qs ? `/classement?${qs}` : "/classement";
  };

  let rows: Row[] = [];
  let villeRows: VilleRow[] = [];

  if (game) {
    if (scope === "VILLES") {
      // ── Classement par ville (école) ─────────────────────────────────────
      // 1. Fetch all player ratings (GLOBAL + 1V1)
      const [{ data: allRatings }, { data: allDuoRatings }] = await Promise.all([
        supabase
          .from("player_ratings")
          .select("profile_id, scope, rating")
          .eq("game_id", game.id)
          .in("scope", ["GLOBAL", "1V1"])
          .gte("played", 1)
          .returns<{ profile_id: string; scope: string; rating: number }[]>(),
        supabase
          .from("duo_ratings")
          .select("profile_lo, profile_hi, rating")
          .eq("game_id", game.id)
          .gte("played", 1)
          .returns<{ profile_lo: string; profile_hi: string; rating: number }[]>(),
      ]);

      // 2. Fetch all involved profiles with their school
      const ratingIds = [...new Set((allRatings ?? []).map((r) => r.profile_id))];
      const duoIds = [
        ...new Set((allDuoRatings ?? []).flatMap((d) => [d.profile_lo, d.profile_hi])),
      ];
      const allIds = [...new Set([...ratingIds, ...duoIds])];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, schools(name, slug)")
        .in("id", allIds)
        .returns<{ id: string; schools: { name: string; slug: string } | null }[]>();

      const profileSchool = new Map(
        (profilesData ?? []).map((p) => [p.id, p.schools?.name ?? null]),
      );

      // 3. Aggregate by ville
      const agg = new Map<string, { g: number[]; v1: number[]; v2: number[] }>();
      function ensureVille(ville: string) {
        if (!agg.has(ville)) agg.set(ville, { g: [], v1: [], v2: [] });
        return agg.get(ville)!;
      }

      for (const r of allRatings ?? []) {
        const ville = profileSchool.get(r.profile_id);
        if (!ville) continue;
        const bucket = ensureVille(ville);
        if (r.scope === "GLOBAL") bucket.g.push(r.rating);
        else if (r.scope === "1V1") bucket.v1.push(r.rating);
      }

      for (const d of allDuoRatings ?? []) {
        const c1 = profileSchool.get(d.profile_lo);
        const c2 = profileSchool.get(d.profile_hi);
        if (!c1 || !c2 || c1 !== c2) continue;
        ensureVille(c1).v2.push(d.rating);
      }

      villeRows = [...agg.entries()]
        .map(([ville, { g, v1, v2 }]) => {
          const eloGlobal = sumTop5(g);
          const elo1v1 = sumTop5(v1);
          const elo2v2 = sumTop5(v2);
          const eloPondere =
            WEIGHTS.global * eloGlobal + WEIGHTS.v1 * elo1v1 + WEIGHTS.v2 * elo2v2;
          return {
            ville,
            color: schoolColorByName.get(ville) ?? null,
            eloGlobal,
            elo1v1,
            elo2v2,
            eloPondere,
          };
        })
        .sort((a, b) => b.eloPondere - a.eloPondere || a.ville.localeCompare(b.ville));
    } else if (scope === "2V2") {
      let q = supabase
        .from("duo_ratings")
        .select("profile_lo, profile_hi, rating, played, won, lost")
        .eq("game_id", game.id)
        .gte("played", min)
        .order("rating", { ascending: false })
        .limit(100)
        .returns<
          {
            profile_lo: string;
            profile_hi: string;
            rating: number;
            played: number;
            won: number;
            lost: number;
          }[]
        >();

      const { data: duos } = await q;
      const ids = [...new Set((duos ?? []).flatMap((d) => [d.profile_lo, d.profile_hi]))];
      const profMap = await fetchProfiles(supabase, ids);

      // Filtre school/annee : au moins un des deux joueurs doit correspondre
      const filtered =
        filterSchoolId || annee
          ? (duos ?? []).filter((d) => {
              const lo = profMap.get(d.profile_lo);
              const hi = profMap.get(d.profile_hi);
              const loMatch =
                (!filterSchoolId || lo?.school_slug === schoolSlug) &&
                (!annee || lo?.annee === annee);
              const hiMatch =
                (!filterSchoolId || hi?.school_slug === schoolSlug) &&
                (!annee || hi?.annee === annee);
              return loMatch || hiMatch;
            })
          : (duos ?? []);

      rows = filtered.map((d, i) => {
        const lo = profMap.get(d.profile_lo);
        const hi = profMap.get(d.profile_hi);
        return {
          key: `${d.profile_lo}-${d.profile_hi}`,
          rank: i + 1,
          rating: d.rating,
          played: d.played,
          won: d.won,
          lost: d.lost,
          players: [
            { id: d.profile_lo, name: lo?.pseudo ?? "?", color: lo?.school_color ?? null },
            { id: d.profile_hi, name: hi?.pseudo ?? "?", color: hi?.school_color ?? null },
          ],
          school: null,
        };
      });
    } else {
      // GLOBAL or 1V1
      let profileIds: string[] | null = null;
      if (filterSchoolId || annee) {
        let pq = supabase
          .from("profiles")
          .select("id")
          .not("pseudo", "is", null);
        if (filterSchoolId) pq = pq.eq("school_id", filterSchoolId);
        if (annee) pq = pq.eq("annee", annee);
        const { data: pdata } = await pq.returns<{ id: string }[]>();
        profileIds = (pdata ?? []).map((p) => p.id);
      }

      if (profileIds === null || profileIds.length > 0) {
        let rq = supabase
          .from("player_ratings")
          .select("profile_id, rating, played, won, lost")
          .eq("game_id", game.id)
          .eq("scope", scope)
          .gte("played", min)
          .order("rating", { ascending: false })
          .limit(100);

        if (profileIds !== null) rq = rq.in("profile_id", profileIds);

        const { data: ratings } = await rq.returns<
          { profile_id: string; rating: number; played: number; won: number; lost: number }[]
        >();
        const ids = (ratings ?? []).map((r) => r.profile_id);
        const profMap = await fetchProfiles(supabase, ids);

        rows = (ratings ?? []).map((r, i) => {
          const p = profMap.get(r.profile_id);
          return {
            key: r.profile_id,
            rank: i + 1,
            rating: r.rating,
            played: r.played,
            won: r.won,
            lost: r.lost,
            players: [{ id: r.profile_id, name: p?.pseudo ?? "?", color: p?.school_color ?? null }],
            school: p?.school_name ?? null,
          };
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <PageHero title={`Classement ${sport}`} description={`Le top des joueurs ${sport}.`}>
          <EloOverlay mode={mode} />
        </PageHero>

      {/* Onglets de périmètre — style identique au profil */}
      <div className="flex border-b border-slate-200">
        {tabs.map((t) => {
          const active = t.scope === scope;
          return (
            <Link
              key={t.scope}
              href={tabHref(t.scope)}
              className={`relative flex flex-1 items-center justify-center py-2.5 text-sm font-semibold transition-colors ${
                active ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600" />
              )}
            </Link>
          );
        })}
      </div>
      </div>

      {/* Filtres école / promo (masqués sur l'onglet Villes) */}
      {scope !== "VILLES" && (
        <Suspense fallback={null}>
          <SchoolPromoFilters schools={schools} basePath="/classement" />
        </Suspense>
      )}

      {scope === "VILLES" ? (
        /* ── Vue villes ───────────────────────────────────────────────── */
        villeRows.length === 0 ? (
          <ComingSoon>Aucune ville classée pour l&apos;instant.</ComingSoon>
        ) : (
          <ol className="flex flex-col gap-2">
            {villeRows.map((v, i) => (
              <li key={v.ville}>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <span
                    className={`w-7 shrink-0 text-center text-sm ${
                      i < 3 ? "text-base" : "font-bold text-slate-400"
                    }`}
                  >
                    {rankBadge(i + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-2">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: v.color ?? "#1e293b" }}
                      >
                        {v.ville}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Global {Math.round(v.eloGlobal)}
                        {v.elo1v1 > 0 ? ` • 1v1 ${Math.round(v.elo1v1)}` : ""}
                        {v.elo2v2 > 0 ? ` • 2v2 ${Math.round(v.elo2v2)}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 pr-1.5 text-right text-base font-bold tabular-nums text-brand-700">
                    {Math.round(v.eloPondere)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )
      ) : (
        /* ── Vue joueurs / duos ───────────────────────────────────────── */
        <>
          {rows.length === 0 ? (
            <ComingSoon>
              Aucun joueur classé pour l&apos;instant
              {!showAll ? " (au moins 5 matchs requis)" : ""}. Les classements se
              remplissent au fil des matchs enregistrés.
            </ComingSoon>
          ) : (
            <ol className="flex flex-col gap-2">
              {rows.map((row) => (
                <li key={row.key}>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <span
                      className={`w-7 shrink-0 text-center text-sm ${
                        row.rank <= 3 ? "text-base" : "font-bold text-slate-400"
                      }`}
                    >
                      {rankBadge(row.rank)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-2">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          {row.players.map((p, idx) => (
                            <span key={p.id ?? idx} className="flex items-center gap-1.5">
                              {idx > 0 && <span className="text-slate-300">&</span>}
                              {p.id ? (
                                <Link
                                  href={`/joueurs/${p.id}`}
                                  className="text-sm font-semibold hover:underline"
                                  style={{ color: p.color ?? "#1e293b" }}
                                >
                                  {p.name}
                                </Link>
                              ) : (
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: p.color ?? "#1e293b" }}
                                >
                                  {p.name}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {row.school ? `${row.school} • ` : ""}
                          {row.won}/{row.lost}
                          {row.played > 0
                            ? ` • ${Math.round((row.won / row.played) * 100)}%`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 pr-1.5 text-right text-base font-bold tabular-nums text-brand-700">
                      {Math.round(row.rating)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="text-center">
            <Link
              href={`/classement?scope=${scope.toLowerCase()}${showAll ? "" : "&all=1"}${schoolSlug ? `&school=${schoolSlug}` : ""}${annee ? `&annee=${annee}` : ""}`}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              {showAll
                ? "Masquer les joueurs avec moins de 5 matchs"
                : "Afficher tout le monde (même < 5 matchs)"}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

async function fetchProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, ProfileLite>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, pseudo, annee, schools(name, slug, color)")
    .in("id", ids)
    .returns<
      { id: string; pseudo: string | null; annee: string | null; schools: { name: string; slug: string; color: string | null } | null }[]
    >();
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        pseudo: p.pseudo,
        annee: p.annee,
        school_slug: p.schools?.slug ?? null,
        school_name: p.schools?.name ?? null,
        school_color: p.schools?.color ?? null,
      },
    ]),
  );
}
