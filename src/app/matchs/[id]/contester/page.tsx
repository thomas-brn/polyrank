import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ContestForm } from "./contest-form";

type Participant = {
  side: "A" | "B";
  is_creator: boolean;
  guest_name: string | null;
  profile_id: string | null;
  profiles: { pseudo: string | null } | null;
};

type FifaSideStats = {
  cartons_rouges: number;
  cartons_jaunes: number;
  retournees: number;
  coups_francs: number;
  sorties_blessure: number;
  fautes_sans_carton?: number;
};

type MatchRow = {
  id: string;
  created_by: string;
  status: string;
  winner_side: "A" | "B" | "NUL";
  score_a: number | null;
  score_b: number | null;
  stats: { a: FifaSideStats; b: FifaSideStats } | null;
  games: { has_score: boolean } | null;
  match_participants: Participant[];
};

function participantLabel(participants: Participant[]): string {
  return (
    participants
      .map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?")
      .join(" & ") || "?"
  );
}

export default async function ContesterMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) redirect("/matchs");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, created_by, status, winner_side, score_a, score_b, stats, games(has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))",
    )
    .eq("id", id)
    .single<MatchRow>();

  if (!match) notFound();

  // Seul un joueur tagué côté adverse peut contester un match VALIDE
  if (match.status !== "VALIDE") redirect(`/matchs/${id}`);

  const creatorSide =
    match.match_participants.find((p) => p.is_creator)?.side ?? "A";
  const isTaggedOpponent = match.match_participants.some(
    (p) => p.profile_id === user.id && p.side !== creatorSide,
  );

  if (!isTaggedOpponent) redirect(`/matchs/${id}`);

  const aParticipants = match.match_participants.filter((p) => p.side === "A");
  const bParticipants = match.match_participants.filter((p) => p.side === "B");
  const sideALabel = participantLabel(aParticipants);
  const sideBLabel = participantLabel(bParticipants);

  const hasScore = match.games?.has_score ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={`/matchs/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" /> Retour au match
        </Link>
      </div>

      <PageHeader title="Contester le résultat" />

      <p className="text-sm text-slate-600">
        Tu penses que le résultat enregistré est incorrect ? Saisis le bon
        résultat ci-dessous. Le créateur du match devra valider ta correction.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        <strong>Important :</strong> si le créateur refuse ta contestation, le
        match sera définitivement supprimé (et les Élos recalculés).
      </div>

      <ContestForm
        matchId={match.id}
        hasScore={hasScore}
        sideALabel={sideALabel}
        sideBLabel={sideBLabel}
        initialScoreA={match.score_a}
        initialScoreB={match.score_b}
        initialWinner={match.winner_side}
        initialStats={match.stats}
      />
    </div>
  );
}
