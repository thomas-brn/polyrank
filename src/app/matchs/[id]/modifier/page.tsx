import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { EditMatchForm } from "./edit-match-form";
import type { Player } from "@/app/matchs/nouveau/player-combobox";

type Participant = {
  side: "A" | "B";
  is_creator: boolean;
  guest_name: string | null;
  profile_id: string | null;
  profiles: { id: string; pseudo: string | null } | null;
};

type FifaSideStats = {
  cartons_rouges: number;
  cartons_jaunes: number;
  retournees: number;
  coups_francs: number;
  sorties_blessure: number;
};

type MatchRow = {
  id: string;
  created_by: string;
  game_id: string;
  winner_side: "A" | "B" | "NUL";
  score_a: number | null;
  score_b: number | null;
  location: string | null;
  stats: { a: FifaSideStats; b: FifaSideStats } | null;
  games: { id: string; name: string; has_score: boolean } | null;
  match_participants: Participant[];
};

export default async function ModifierMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    redirect("/matchs");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, created_by, game_id, winner_side, score_a, score_b, location, stats, games(id, name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(id, pseudo))",
    )
    .eq("id", id)
    .single<MatchRow>();

  if (!match) notFound();
  if (match.created_by !== user.id) redirect(`/matchs/${id}`);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("pseudo")
    .eq("id", user.id)
    .single<{ pseudo: string | null }>();

  if (!profileRow?.pseudo) redirect("/inscription");

  const { data: games } = await supabase
    .from("games")
    .select("id, name, has_score")
    .eq("is_active", true)
    .order("name");

  const mates: Player[] = match.match_participants
    .filter((p) => p.side === "A" && !p.is_creator)
    .map((p) => ({
      name: p.profiles?.pseudo ?? p.guest_name ?? "",
      profileId: p.profile_id,
    }));

  const opps: Player[] = match.match_participants
    .filter((p) => p.side === "B")
    .map((p) => ({
      name: p.profiles?.pseudo ?? p.guest_name ?? "",
      profileId: p.profile_id,
    }));

  return (
    <div>
      <PageHeader title="Modifier le match" />
      <EditMatchForm
        matchId={match.id}
        games={games ?? []}
        myPseudo={profileRow.pseudo}
        myId={user.id}
        initialGameId={match.game_id}
        initialMates={mates}
        initialOpps={opps}
        initialScoreA={match.score_a}
        initialScoreB={match.score_b}
        initialWinner={match.winner_side}
        initialLocation={match.location ?? ""}
        initialStats={match.stats}
      />
    </div>
  );
}
