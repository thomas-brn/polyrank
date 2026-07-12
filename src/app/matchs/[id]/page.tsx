import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Calendar, Clock, Flag, MapPin, Pencil, Trash2 } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { Panel, sidePlayers } from "@/components/match-card";
import { ANNEE_LABELS } from "@/lib/constants";
import type { Mode } from "@/lib/mode";
import { deleteMatch } from "./modifier/actions";
import { acceptContest, refuseContest, approveDeletion, rejectDeletion } from "./actions";
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

type ProposedChanges = {
  action?: "DELETE";
  reason?: string;
  winner_side?: "A" | "B" | "NUL";
  score_a?: number | null;
  score_b?: number | null;
  stats?: { a: Record<string, number>; b: Record<string, number> };
};

const STAT_LABELS: Record<string, string> = {
  cartons_rouges: "Cartons rouges",
  cartons_jaunes: "Cartons jaunes",
  retournees: "Retournées",
  coups_francs: "Coups francs directs",
  sorties_blessure: "Sorties sur blessure",
  fautes_sans_carton: "Fautes sans carton",
};
const STAT_KEYS = Object.keys(STAT_LABELS);

type ContestRow = {
  label: string;
  current: string | number;
  proposed: string | number;
  changed: boolean;
};

type DetailMatchRow = {
  id: string;
  game_id: string;
  format: string;
  status: string;
  is_friendly: boolean;
  winner_side: "A" | "B" | "NUL";
  score_a: number | null;
  score_b: number | null;
  played_at: string;
  location: string | null;
  created_by: string;
  stats: MatchStats;
  proposed_changes: ProposedChanges | null;
  games: { name: string; has_score: boolean; slug: string } | null;
  match_participants: DetailParticipant[];
};

// TODO: photos de profil — réactiver avec Supabase Storage
// function initials(name: string): string {
//   const parts = name.trim().split(/[\s_-]+/);
//   if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
//   return name.slice(0, 2).toUpperCase();
// }

type EloLine = { label: string; before: number; delta: number };

function formatEloDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded > 0) return `+ ${rounded}`;
  if (rounded < 0) return `- ${Math.abs(rounded)}`;
  return `${rounded}`;
}

function EloDeltaList({ lines }: { lines: EloLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {lines.map(({ label, before, delta }) => (
        <span key={label} className="text-xs font-medium tabular-nums text-slate-500">
          Elo {label} : {Math.round(before)}{" "}
          <span className={delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-500" : "text-slate-400"}>
            {formatEloDelta(delta)}
          </span>
        </span>
      ))}
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
      "id, game_id, format, status, is_friendly, winner_side, score_a, score_b, played_at, location, created_by, stats, proposed_changes, games(name, has_score, slug), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo, annee, schools(name)))",
    )
    .eq("id", id)
    .single<DetailMatchRow>();

  if (!match) notFound();

  const isCreator = user?.id === match.created_by;

  const creatorSide =
    match.match_participants.find((p) => p.is_creator)?.side ?? "A";
  const isTaggedOpponent =
    !!user &&
    match.match_participants.some(
      (p) => p.profile_id === user.id && p.side !== creatorSide,
    );

  let isAdmin = false;
  if (user) {
    const { data: viewer } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single<{ is_admin: boolean }>();
    isAdmin = viewer?.is_admin ?? false;
  }

  const deletionRequest =
    match.status === "EN_APPEL" && match.proposed_changes?.action === "DELETE"
      ? match.proposed_changes
      : null;

  const mode: Mode =
    match.games?.slug === "coincoin" ? "coincoin" : "fifachamp";
  const isFifa = match.games?.has_score ?? false;

  const isDraw = match.winner_side === "NUL";
  const aWins = match.winner_side === "A";
  const bWins = match.winner_side === "B";

  const aParticipants = match.match_participants.filter((p) => p.side === "A");
  const bParticipants = match.match_participants.filter((p) => p.side === "B");

  const aLabel = aParticipants
    .map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?")
    .join(" & ");
  const bLabel = bParticipants
    .map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?")
    .join(" & ");

  const winnerName = (side: "A" | "B" | "NUL") =>
    side === "A" ? aLabel : side === "B" ? bLabel : "Nul";

  // Lignes de comparaison Actuel vs Proposé pour la bannière contestation
  const contestRows: ContestRow[] = [];
  if (match.status === "CONTESTE" && match.proposed_changes && !match.proposed_changes.action) {
    const pc = match.proposed_changes;

    contestRows.push({
      label: "Vainqueur",
      current: winnerName(match.winner_side),
      proposed: winnerName(pc.winner_side ?? match.winner_side),
      changed: !!pc.winner_side && pc.winner_side !== match.winner_side,
    });

    if (isFifa) {
      const cA = match.score_a ?? 0;
      const cB = match.score_b ?? 0;
      const pA = pc.score_a ?? cA;
      const pB = pc.score_b ?? cB;
      contestRows.push({
        label: `Buts ${aLabel}`,
        current: cA,
        proposed: pA,
        changed: pA !== cA,
      });
      contestRows.push({
        label: `Buts ${bLabel}`,
        current: cB,
        proposed: pB,
        changed: pB !== cB,
      });
      // Stats : seulement les lignes modifiées
      for (const side of ["a", "b"] as const) {
        const sideLabel = side === "a" ? aLabel : bLabel;
        for (const key of STAT_KEYS) {
          const cur = (match.stats as { a?: Record<string, number>; b?: Record<string, number> } | null)?.[side]?.[key] ?? 0;
          const prp = pc.stats?.[side]?.[key] ?? cur;
          if (prp !== cur) {
            contestRows.push({
              label: `${STAT_LABELS[key]} (${sideLabel})`,
              current: cur,
              proposed: prp,
              changed: true,
            });
          }
        }
      }
    }
  }

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

  const profileIds = match.match_participants
    .filter((p) => p.profile_id !== null)
    .map((p) => p.profile_id as string);

  // --- ELO deltas ---

  // Helpers
  function duoKey(p1: string, p2: string) {
    return p1 < p2 ? { lo: p1, hi: p2 } : { lo: p2, hi: p1 };
  }
  type RatingChange = { before: number; delta: number };
  function histDelta<T extends { id: number; match_id: string | null; rating: number }>(
    rows: T[],
    matchId: string,
  ): RatingChange | undefined {
    const idx = rows.findIndex((r) => r.match_id === matchId);
    if (idx === -1) return undefined;
    const after = Number(rows[idx].rating);
    const before = idx > 0 ? Number(rows[idx - 1].rating) : 1000;
    return { before, delta: after - before };
  }

  // Individual GLOBAL + 1V1 deltas (rating_history)
  const eloDeltas: Record<string, Record<string, RatingChange>> = {};
  if (profileIds.length > 0) {
    const { data: history } = await supabase
      .from("rating_history")
      .select("id, profile_id, scope, match_id, rating")
      .eq("game_id", match.game_id)
      .in("profile_id", profileIds)
      .order("id", { ascending: true });

    if (history) {
      const grouped = new Map<string, typeof history>();
      for (const row of history) {
        const key = `${row.profile_id}:${row.scope}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      }
      for (const [key, rows] of grouped) {
        const colonIdx = key.indexOf(":");
        const profile_id = key.slice(0, colonIdx);
        const scope = key.slice(colonIdx + 1);
        const change = histDelta(rows, match.id);
        if (change === undefined) continue;
        if (!eloDeltas[profile_id]) eloDeltas[profile_id] = {};
        eloDeltas[profile_id][scope] = change;
      }
    }
  }

  // Duo deltas (duo_rating_history) — only when both players on a side are linked
  const aLinkedIds = aParticipants.map((p) => p.profile_id).filter((id): id is string => id !== null);
  const bLinkedIds = bParticipants.map((p) => p.profile_id).filter((id): id is string => id !== null);
  const aDuo = aLinkedIds.length === 2 ? duoKey(aLinkedIds[0], aLinkedIds[1]) : null;
  const bDuo = bLinkedIds.length === 2 ? duoKey(bLinkedIds[0], bLinkedIds[1]) : null;

  let aDuoChange: RatingChange | undefined;
  let bDuoChange: RatingChange | undefined;

  if (aDuo || bDuo) {
    const duoQueries = [
      aDuo
        ? supabase
            .from("duo_rating_history")
            .select("id, match_id, rating")
            .eq("game_id", match.game_id)
            .eq("profile_lo", aDuo.lo)
            .eq("profile_hi", aDuo.hi)
            .order("id", { ascending: true })
        : Promise.resolve({ data: null }),
      bDuo
        ? supabase
            .from("duo_rating_history")
            .select("id, match_id, rating")
            .eq("game_id", match.game_id)
            .eq("profile_lo", bDuo.lo)
            .eq("profile_hi", bDuo.hi)
            .order("id", { ascending: true })
        : Promise.resolve({ data: null }),
    ] as const;

    const [aResult, bResult] = await Promise.all(duoQueries);
    if (aResult.data) aDuoChange = histDelta(aResult.data, match.id);
    if (bResult.data) bDuoChange = histDelta(bResult.data, match.id);
  }

  // Build EloLine arrays per player (global + 1v1), plus one shared "duo" line for the team
  function buildPlayerEloLines(linkedId: string): EloLine[] {
    const lines: EloLine[] = [];
    const pd = eloDeltas[linkedId];
    if (pd?.["GLOBAL"] !== undefined) lines.push({ label: "global", ...pd["GLOBAL"] });
    if (pd?.["1V1"] !== undefined) lines.push({ label: "1v1", ...pd["1V1"] });
    return lines;
  }

  const boundDelete = deleteMatch.bind(null, match.id);
  const boundAccept = acceptContest.bind(null, match.id);
  const boundRefuse = refuseContest.bind(null, match.id);
  const boundApproveDeletion = approveDeletion.bind(null, match.id);
  const boundRejectDeletion = rejectDeletion.bind(null, match.id);

  const fifaStats = isFifa ? match.stats : null;

  // Données de la contestation active (ne concerne pas les demandes de suppression)
  const isContested =
    match.status === "CONTESTE" &&
    !!match.proposed_changes &&
    !match.proposed_changes.action;
  const propChanges = isContested ? match.proposed_changes : null;

  const FIFACHAMP_STAT_ROWS = [
    { key: "cartons_rouges" as const, label: "Cartons rouges", optional: false },
    { key: "cartons_jaunes" as const, label: "Cartons jaunes", optional: false },
    { key: "retournees" as const, label: "Retournées", optional: false },
    { key: "coups_francs" as const, label: "Coups francs directs", optional: false },
    { key: "sorties_blessure" as const, label: "Sorties sur blessure", optional: false },
    { key: "fautes_sans_carton" as const, label: "Fautes sans carton", optional: true },
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
          {match.is_friendly && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[12px] font-medium text-sky-600">
              Match amical
            </span>
          )}
        </div>

        {/* Score panels */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch px-2.5 pt-2 pb-2 sm:px-3 sm:pt-2.5 sm:pb-2.5">
          <Panel
            players={sidePlayers(match.match_participants, "A")}
            result={isDraw ? "draw" : aWins ? "win" : "loss"}
            mode={mode}
            align="left"
            linkNames
          />
          <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3">
            <div className="w-px flex-1 min-h-2 sm:min-h-2.5 bg-slate-200" />
            <span className="text-[22px] sm:text-[26px] font-medium italic text-slate-400 leading-none whitespace-nowrap">
              VS
            </span>
            <div className="w-px flex-1 min-h-2 sm:min-h-2.5 bg-slate-200" />
          </div>
          <Panel
            players={sidePlayers(match.match_participants, "B")}
            result={isDraw ? "draw" : bWins ? "win" : "loss"}
            mode={mode}
            align="right"
            linkNames
          />
        </div>

        {/* Footer */}
        <div className="pb-2.5 sm:pb-3 px-3 sm:px-4 flex items-center justify-center gap-2">
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

      {/* Bannière contestation : visible pour le créateur quand CONTESTE */}
      {isCreator && isContested ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-800">
              {bLabel} conteste ce résultat
              {!isFifa && propChanges?.winner_side ? (
                <span className="font-normal text-red-700">
                  {" "}— résultat proposé :{" "}
                  <strong>{winnerName(propChanges.winner_side)} gagne</strong>
                </span>
              ) : null}
            </p>
          </div>
          {isFifa ? (
            <p className="text-xs text-red-700">
              Les modifications proposées sont indiquées directement dans le tableau des stats ci-dessous.
            </p>
          ) : null}
          <div className="flex gap-2">
            <form action={boundAccept}>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Accepter la correction
              </button>
            </form>
            <form action={boundRefuse}>
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Refuser (supprime le match)
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Bannière demande de suppression : visible par tous quand EN_APPEL */}
      {deletionRequest ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Trash2 className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Suppression demandée par l&apos;adversaire
              </p>
              {deletionRequest.reason ? (
                <p className="text-xs text-amber-700 mt-0.5">
                  Motif : « {deletionRequest.reason} »
                </p>
              ) : null}
              <p className="text-xs text-amber-700/80 mt-1">
                {isAdmin
                  ? "Tranche la demande ci-dessous."
                  : "Un admin va trancher cette demande."}
              </p>
            </div>
          </div>
          {isAdmin ? (
            <div className="flex gap-2">
              <form action={boundApproveDeletion}>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Supprimer le match
                </button>
              </form>
              <form action={boundRejectDeletion}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Rejeter, garder le match
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Détails des joueurs (commun aux deux modes) */}
      <div className={`rounded-xl border bg-white p-4 ${isContested ? "border-red-300" : "border-slate-200"}`}>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Joueurs</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { side: "A" as const, players: aParticipants, wins: aWins, label: aLabel, duo: aDuo, duoChange: aDuoChange },
            { side: "B" as const, players: bParticipants, wins: bWins, label: bLabel, duo: bDuo, duoChange: bDuoChange },
          ].map(({ side, players, wins, label, duo, duoChange }) => {
            const proposedWins = isContested && propChanges?.winner_side === side;
            const proposedLoses = isContested && propChanges?.winner_side !== undefined && propChanges.winner_side !== side;
            return (
            <div key={side} className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                Équipe {side}
                {proposedWins && !wins && (
                  <span className="rounded px-1 py-px text-[10px] font-semibold bg-red-100 text-red-700 normal-case tracking-normal">
                    Proposé : Victoire
                  </span>
                )}
                {proposedLoses && wins && (
                  <span className="rounded px-1 py-px text-[10px] font-semibold bg-red-100 text-red-700 normal-case tracking-normal">
                    Proposé : Défaite
                  </span>
                )}
              </p>
              {players.map((p) => {
                const name = p.profiles?.pseudo ?? p.guest_name ?? "?";
                const profile = p.profiles;
                const ecole = profile?.schools?.name ?? null;
                const annee = profile?.annee
                  ? ANNEE_LABELS[profile.annee]
                  : null;
                const eloLines =
                  !match.is_friendly && p.profile_id
                    ? buildPlayerEloLines(p.profile_id)
                    : [];

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
                    {profile && (annee || ecole) ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {[annee, ecole].filter(Boolean).join(" ")}
                      </p>
                    ) : null}
                    <EloDeltaList lines={eloLines} />
                  </div>
                );
              })}
              {!match.is_friendly && duo && duoChange ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-800">Duo {label}</span>
                  <EloDeltaList lines={[{ label: "duo", ...duoChange }]} />
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      </div>

      {/* FifaChamp : tableau de stats */}
      {isFifa ? (
        <div className={`overflow-hidden rounded-xl border bg-white ${isContested ? "border-red-300" : "border-slate-200"}`}>
          <div className={`grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5 text-xs font-semibold ${isContested ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-500"}`}>
            <span>{aLabel}</span>
            <span className="px-3 text-center text-[10px] uppercase tracking-wider opacity-60">
              Stat
            </span>
            <span className="text-right">{bLabel}</span>
          </div>

          {/* Buts */}
          {(() => {
            const curA = match.score_a ?? 0;
            const curB = match.score_b ?? 0;
            const propA = propChanges?.score_a ?? curA;
            const propB = propChanges?.score_b ?? curB;
            const aChanged = isContested && propA !== curA;
            const bChanged = isContested && propB !== curB;
            return (
              <div className={`grid grid-cols-[1fr_auto_1fr] items-center border-t px-4 py-2.5 ${(aChanged || bChanged) ? "border-red-100 bg-red-50/40" : "border-slate-100"}`}>
                {aChanged ? (
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-slate-400 line-through">{curA}</span>
                    <span className="text-base font-bold text-red-600">{propA}</span>
                  </span>
                ) : (
                  <span className="text-base font-bold text-slate-800">{curA}</span>
                )}
                <span className={`px-3 text-center text-xs whitespace-nowrap ${(aChanged || bChanged) ? "text-red-400" : "text-slate-400"}`}>Buts</span>
                {bChanged ? (
                  <span className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-base font-bold text-slate-400 line-through">{curB}</span>
                    <span className="text-base font-bold text-red-600">{propB}</span>
                  </span>
                ) : (
                  <span className="text-right text-base font-bold text-slate-800">{curB}</span>
                )}
              </div>
            );
          })()}

          {FIFACHAMP_STAT_ROWS.map(({ key, label, optional }) => {
            const valA = fifaStats?.a?.[key] ?? 0;
            const valB = fifaStats?.b?.[key] ?? 0;
            const propA = propChanges?.stats?.a?.[key] ?? valA;
            const propB = propChanges?.stats?.b?.[key] ?? valB;
            const aChanged = isContested && propA !== valA;
            const bChanged = isContested && propB !== valB;
            if (optional && valA === 0 && valB === 0 && propA === 0 && propB === 0) return null;
            return (
              <div
                key={key}
                className={`grid grid-cols-[1fr_auto_1fr] items-center border-t px-4 py-2 ${(aChanged || bChanged) ? "border-red-100 bg-red-50/40" : "border-slate-100"}`}
              >
                {aChanged ? (
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-sm text-slate-400 line-through">{valA}</span>
                    <span className="text-sm font-semibold text-red-600">{propA}</span>
                  </span>
                ) : (
                  <span className="text-sm font-medium text-slate-700">{valA}</span>
                )}
                <span className={`px-3 text-center text-xs whitespace-nowrap ${(aChanged || bChanged) ? "text-red-400" : "text-slate-400"}`}>
                  {label}
                </span>
                {bChanged ? (
                  <span className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-sm text-slate-400 line-through">{valB}</span>
                    <span className="text-sm font-semibold text-red-600">{propB}</span>
                  </span>
                ) : (
                  <span className="text-right text-sm font-medium text-slate-700">{valB}</span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Actions de l'adversaire tagué quand VALIDE */}
      {isTaggedOpponent && match.status === "VALIDE" ? (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/matchs/${match.id}/contester`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Flag className="size-4" />
            Contester le résultat
          </Link>
          <Link
            href={`/matchs/${match.id}/supprimer`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Trash2 className="size-4" />
            Demander la suppression
          </Link>
        </div>
      ) : null}

      {/* Actions du créateur (gelées si contesté ou en appel) */}
      {isCreator && match.status === "VALIDE" ? (
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

    </div>
  );
}
