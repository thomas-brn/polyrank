import { LifeBuoy, Sparkles } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { PlayerSearch } from "@/components/player-search";
import { RulesOverlay } from "@/components/rules-overlay";
import { getMode, MODES } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const SUPPORT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeD6zfOWPzLWnPNSUAIKehx-L73FUpHVPNgNNx66Rk5lK_vZA/viewform?usp=dialog";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type SiteStats = {
  matches30d: number;
  activePlayers30d: number;
  schoolsActive30d: number;
  totalMatches: number;
};

async function getSiteStats(mode: string): Promise<SiteStats | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();
  if (!game) return null;

  const [{ count: matches30d }, { count: totalMatches }, { data: parts }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("game_id", game.id)
        .eq("status", "VALIDE")
        .gte("played_at", cutoff),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("game_id", game.id)
        .eq("status", "VALIDE"),
      supabase
        .from("match_participants")
        .select("profile_id, matches!inner(game_id, status, played_at)")
        .eq("matches.game_id", game.id)
        .eq("matches.status", "VALIDE")
        .gte("matches.played_at", cutoff)
        .not("profile_id", "is", null)
        .returns<{ profile_id: string }[]>(),
    ]);

  const activePlayerIds = new Set((parts ?? []).map((p) => p.profile_id));

  let schoolsActive30d = 0;
  if (activePlayerIds.size > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("school_id")
      .in("id", [...activePlayerIds])
      .returns<{ school_id: string | null }[]>();
    schoolsActive30d = new Set(
      (profilesData ?? []).map((p) => p.school_id).filter(Boolean),
    ).size;
  }

  return {
    matches30d: matches30d ?? 0,
    activePlayers30d: activePlayerIds.size,
    schoolsActive30d,
    totalMatches: totalMatches ?? 0,
  };
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-slate-50 py-4 text-center">
      <span className="text-2xl font-bold tabular-nums text-brand-700">
        {value}
      </span>
      <span className="mt-1 text-[11px] text-slate-500">{label}</span>
    </div>
  );
}

export default async function HomePage() {
  const mode = await getMode();
  const sport = MODES[mode].sport;
  const stats = await getSiteStats(mode);

  return (
    <div className="flex flex-col">
      <section className="mb-4 flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-accent p-6 pb-3 text-white md:flex-row md:items-center md:justify-between md:gap-6 md:pb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">
            Poly<span className="text-brand-100">Rank</span>
          </h1>
          <p className="mt-2 max-w-md text-brand-50">
            Saisis tes résultats de matchs {sport} et grimpe dans les
            classements, par école et par promo.
          </p>
        </div>
        <ModeToggle current={mode} />
      </section>

      <PlayerSearch />

      {stats ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 pt-4">
          <h2 className="text-sm font-semibold text-slate-500">
            {sport} en quelques chiffres
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Matchs ce mois" value={stats.matches30d} />
            <StatTile label="Joueurs actifs ce mois" value={stats.activePlayers30d} />
            <StatTile label="Écoles actives ce mois" value={stats.schoolsActive30d} />
            <StatTile label="Matchs au total" value={stats.totalMatches} />
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <RulesOverlay mode={mode} className="h-full" />

        <a
          href={SUPPORT_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-sm"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <LifeBuoy size={16} className="text-brand-700" />
            Contacter le support
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Une suggestion, une question, un bug ? Écris-nous.
          </p>
        </a>
      </div>
    </div>
  );
}
