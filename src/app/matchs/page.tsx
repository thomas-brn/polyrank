import Link from "next/link";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { MatchCard, type MatchData } from "@/components/match-card";
import { getMode, MODES } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MATCH_SELECT =
  "id, format, status, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

export default async function MatchsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Historique" />
        <ComingSoon>Authentification non configurée (voir le README).</ComingSoon>
      </div>
    );
  }

  const supabase = await createClient();

  const mode = await getMode();
  const sport = MODES[mode].sport;
  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();
  const gameId = game?.id ?? "";

  let matches: MatchData[] = [];
  if (gameId) {
    const { data } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("game_id", gameId)
      .order("played_at", { ascending: false })
      .limit(50)
      .returns<MatchData[]>();
    matches = data ?? [];
  }

  return (
    <div>
      <div className="mb-6">
        <PageHero
          title={`Historique ${sport}`}
          description={`Tous les matchs ${sport} joués, à valider ou contester.`}
        />
      </div>

      {matches.length === 0 ? (
        <ComingSoon>
          Aucun match {sport} pour l&apos;instant. Sois le premier à en saisir un !
        </ComingSoon>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => {
            const creatorSide = match.match_participants.find((p) => p.is_creator)?.side ?? "B";
            const leftSide = creatorSide === "A" ? "B" : "A";
            return <MatchCard key={match.id} match={match} mode={mode} leftSide={leftSide} from="matchs" />;
          })}
        </ul>
      )}
    </div>
  );
}
