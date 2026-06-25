import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle, Clock, MapPin, Pencil, School, User } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { PANEL_COLORS, STATUS } from "@/components/match-card";
import { ANNEE_LABELS } from "@/lib/constants";
import type { Mode } from "@/lib/mode";
import { deleteMatch } from "./modifier/actions";
import { validateMatch } from "./actions";
import { DeleteButton } from "./delete-button";

type DetailProfile = {
  pseudo: string | null;
  annee: string | null;
  schools: { name: string } | null;
};

type DetailParticipant = {
  side: "A" | "B";
  is_creator: boolean;
  guest_name: string | null;
  profile_id: string | null;
  profiles: DetailProfile | null;
};

type FifaSideStats = {
  cartons_rouges?: number;
  cartons_jaunes?: number;
  retournees?: number;
  coups_francs?: number;
  sorties_blessure?: number;
  fautes_sans_carton?: number;
};

type MatchStats = { a?: FifaSideStats; b?: FifaSideStats } | null;

type DetailMatchRow = {
  id: string;
  format: string;
  status: string;
  winner_side: "A" | "B" | "NUL";
  score_a: number | null;
  score_b: number | null;
  played_at: string;
  location: string | null;
  created_by: string;
  stats: MatchStats;
  games: { name: string; has_score: boolean; slug: string } | null;
  match_participants: DetailParticipant[];
};

function initials(name: string): string {
  const parts = name.trim().split(/[\s_-]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function SidePanel({
  participants,
  result,
  mode,
  align,
}: {
  participants: DetailParticipant[];
  result: "win" | "loss" | "draw";
  mode: Mode;
  align: "left" | "right";
}) {
  const colors =
    result === "win"
      ? PANEL_COLORS.win[mode]
      : result === "loss"
        ? PANEL_COLORS.loss
        : PANEL_COLORS.draw;
  const label =
    result === "win" ? "Victoire" : result === "loss" ? "Défaite" : "Nul";
  const multi = participants.length > 1;
  const avatarSize = multi ? "size-5 text-[10px]" : "size-6 text-[11px]";
  const nameSize = multi ? "text-[12px]" : "text-[13px]";

  return (
    <div
      className={`${colors.bg} rounded-lg px-2 py-1.5 flex flex-col gap-1 justify-center`}
    >
      <div
        className={`flex flex-col gap-1 ${align === "right" ? "items-end" : "items-start"}`}
      >
        {participants.map((p) => {
          const name = p.profiles?.pseudo ?? p.guest_name ?? "?";
          return (
            <div
              key={p.profile_id ?? p.guest_name}
              className={`flex items-center gap-1.5 ${align === "right" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`${avatarSize} rounded-full bg-white border-[1.5px] ${colors.avatar} flex items-center justify-center font-medium shrink-0`}
              >
                {initials(name)}
              </div>
              {p.profile_id ? (
                <Link
                  href={`/joueurs/${p.profile_id}`}
                  className={`${nameSize} font-semibold ${colors.name} leading-tight hover:underline`}
                >
                  {name}
                </Link>
              ) : (
                <em
                  className={`${nameSize} font-normal ${colors.name} leading-tight opacity-70`}
                >
                  {name}
                </em>
              )}
            </div>
          );
        })}
      </div>
      <span
        className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${colors.label} opacity-70 ${align === "right" ? "text-right" : ""}`}
      >
        {label}
      </span>
    </div>
  );
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const backHref = from === "profil" ? "/profil" : "/matchs";

  if (!isSupabaseConfigured) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, format, status, winner_side, score_a, score_b, played_at, location, created_by, stats, games(name, has_score, slug), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo, annee, schools(name)))",
    )
    .eq("id", id)
    .single<DetailMatchRow>();

  if (!match) notFound();

  const isCreator = user?.id === match.created_by;
  const canValidate = await (async () => {
    if (!user || isCreator) return false;
    if (!["SOUMIS", "MODIFIE"].includes(match.status)) return false;
    const { data } = await supabase
      .from("match_participants")
      .select("side")
      .eq("match_id", match.id)
      .eq("profile_id", user.id)
      .maybeSingle<{ side: "A" | "B" }>();
    if (!data) return false;
    const creatorSide = match.match_participants.find((p) => p.is_creator)?.side;
    return data.side !== creatorSide;
  })();

  const mode: Mode =
    match.games?.slug === "coincoin" ? "coincoin" : "fifachamp";
  const isFifa = match.games?.has_score ?? false;

  const isDraw = match.winner_side === "NUL";
  const aWins = match.winner_side === "A";
  const bWins = match.winner_side === "B";

  const aParticipants = match.match_participants.filter((p) => p.side === "A");
  const bParticipants = match.match_participants.filter((p) => p.side === "B");

  const status = STATUS[match.status] ?? {
    label: match.status,
    className: "bg-slate-100 text-slate-600",
  };

  const dt = new Date(match.played_at);
  const date = dt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = dt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Match counts for CoinCoin player detail
  let matchCounts = new Map<string, number>();
  if (!isFifa) {
    const profileIds = match.match_participants
      .filter((p) => p.profile_id !== null)
      .map((p) => p.profile_id as string);
    if (profileIds.length > 0) {
      const { data: allParts } = await supabase
        .from("match_participants")
        .select("profile_id")
        .in("profile_id", profileIds);
      for (const row of allParts ?? []) {
        if (row.profile_id) {
          matchCounts.set(
            row.profile_id,
            (matchCounts.get(row.profile_id) ?? 0) + 1,
          );
        }
      }
    }
  }

  const boundDelete = deleteMatch.bind(null, match.id);
  const boundValidate = validateMatch.bind(null, match.id, backHref);

  const fifaStats = isFifa ? match.stats : null;

  const FIFACHAMP_STAT_ROWS = [
    { key: "cartons_rouges" as const, label: "Cartons rouges", emoji: "🟥", optional: false },
    { key: "cartons_jaunes" as const, label: "Cartons jaunes", emoji: "🟨", optional: false },
    { key: "retournees" as const, label: "Retournées", emoji: "🤸", optional: false },
    { key: "coups_francs" as const, label: "Coups francs directs", emoji: "🎯", optional: false },
    { key: "sorties_blessure" as const, label: "Sorties sur blessure", emoji: "🩹", optional: false },
    { key: "fautes_sans_carton" as const, label: "Fautes sans carton", emoji: "🤚", optional: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" /> Retour
        </Link>
      </div>

      {/* Match card - inspired by history cards */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-[12px] font-medium tracking-[0.04em] text-slate-400 uppercase">
            {match.games?.name} · {match.format}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* Score panels */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch px-2.5 pt-2 pb-2">
          <SidePanel
            participants={aParticipants}
            result={isDraw ? "draw" : aWins ? "win" : "loss"}
            mode={mode}
            align="left"
          />
          <div className="flex flex-col items-center justify-center gap-1 px-2">
            <div className="w-px flex-1 bg-slate-200" />
            <span className="text-[22px] font-medium italic text-slate-400 leading-none whitespace-nowrap">
              VS
            </span>
            <div className="w-px flex-1 bg-slate-200" />
          </div>
          <SidePanel
            participants={bParticipants}
            result={isDraw ? "draw" : bWins ? "win" : "loss"}
            mode={mode}
            align="right"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 px-4 pb-3">
          {match.location && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <MapPin className="size-3" />
              {match.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="size-3" />
            {date}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="size-3" />
            {time}
          </span>
        </div>
      </div>

      {/* Actions */}
      {canValidate ? (
        <form action={boundValidate}>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            <CheckCircle className="size-4" />
            Valider ce match
          </button>
        </form>
      ) : null}

      {isCreator ? (
        <div className="flex gap-3">
          <Link
            href={`/matchs/${match.id}/modifier`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Pencil className="size-4" />
            Modifier
          </Link>
          <form action={boundDelete}>
            <DeleteButton />
          </form>
        </div>
      ) : null}

      {/* CoinCoin : détails des joueurs */}
      {!isFifa ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Joueurs</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { side: "A" as const, players: aParticipants, wins: aWins },
              { side: "B" as const, players: bParticipants, wins: bWins },
            ].map(({ side, players, wins }) => (
              <div key={side} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Équipe {side} {wins ? "🏆" : ""}
                </p>
                {players.map((p) => {
                  const name = p.profiles?.pseudo ?? p.guest_name ?? "?";
                  const profile = p.profiles;
                  const ecole = profile?.schools?.name ?? null;
                  const annee = profile?.annee
                    ? ANNEE_LABELS[profile.annee]
                    : null;
                  const count = p.profile_id
                    ? matchCounts.get(p.profile_id)
                    : null;

                  return (
                    <div
                      key={p.profile_id ?? p.guest_name}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      {p.profile_id ? (
                        <Link
                          href={`/joueurs/${p.profile_id}`}
                          className="text-sm font-semibold text-slate-800 hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="text-sm font-normal italic text-slate-500">
                          {name}
                        </span>
                      )}
                      {profile ? (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {ecole && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <School className="size-3" />
                              {ecole}
                            </span>
                          )}
                          {annee && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <User className="size-3" />
                              {annee}
                            </span>
                          )}
                          {count != null && (
                            <span className="text-xs text-slate-400">
                              {count} match{count > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* FifaChamp : tableau de stats */}
      {isFifa ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500">
            <span>
              {aParticipants.map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?").join(" & ")}
            </span>
            <span className="px-3 text-center text-[10px] uppercase tracking-wider text-slate-400">
              Stat
            </span>
            <span className="text-right">
              {bParticipants.map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?").join(" & ")}
            </span>
          </div>

          {/* Buts */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-slate-100 px-4 py-2.5">
            <span className="text-base font-bold text-slate-800">
              {match.score_a ?? 0}
            </span>
            <span className="px-3 text-center text-xs text-slate-400">⚽ Buts</span>
            <span className="text-right text-base font-bold text-slate-800">
              {match.score_b ?? 0}
            </span>
          </div>

          {FIFACHAMP_STAT_ROWS.map(({ key, label, emoji, optional }) => {
            const valA = fifaStats?.a?.[key] ?? 0;
            const valB = fifaStats?.b?.[key] ?? 0;
            if (optional && valA === 0 && valB === 0) return null;
            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-slate-100 px-4 py-2"
              >
                <span className="text-sm font-medium text-slate-700">{valA}</span>
                <span className="px-3 text-center text-xs text-slate-400 whitespace-nowrap">
                  {emoji} {label}
                  {optional && (
                    <span className="ml-1 opacity-60">(optionnel)</span>
                  )}
                </span>
                <span className="text-right text-sm font-medium text-slate-700">{valB}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* FifaChamp : joueurs avec liens */}
      {isFifa ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Joueurs</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { side: "A" as const, players: aParticipants, wins: aWins },
              { side: "B" as const, players: bParticipants, wins: bWins },
            ].map(({ side, players, wins }) => (
              <div key={side} className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Équipe {side} {wins ? "🏆" : ""}
                </p>
                {players.map((p) => {
                  const name = p.profiles?.pseudo ?? p.guest_name ?? "?";
                  return p.profile_id ? (
                    <Link
                      key={p.profile_id}
                      href={`/joueurs/${p.profile_id}`}
                      className="text-sm font-semibold text-slate-700 hover:underline"
                    >
                      {name}
                    </Link>
                  ) : (
                    <em
                      key={p.guest_name}
                      className="text-sm font-normal text-slate-400"
                    >
                      {name}
                    </em>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
