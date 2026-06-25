import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PageHero } from "@/components/page-hero";
import { ProfileSettingsMenu } from "@/components/profile-settings-menu";
import { MatchCard, type MatchData } from "@/components/match-card";
import { ANNEE_LABELS } from "@/lib/constants";
import { getMode, MODES } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { validateMatch } from "@/app/matchs/[id]/actions";

const MATCH_SELECT =
  "id, format, status, winner_side, score_a, score_b, played_at, location, games(name, has_score), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))";

type ProfileRow = {
  pseudo: string | null;
  annee: string | null;
  schools: { name: string } | null;
};

export default async function ProfilPage() {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Mon profil" />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Authentification non configurée (voir le README).
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <PageHeader title="Mon profil" />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            Connecte-toi ou crée un compte pour accéder à ton profil.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/login"
              className="inline-flex rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo, annee, schools(name)")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (!profile?.pseudo) {
    return (
      <div>
        <PageHeader title="Mon profil" subtitle={user.email ?? undefined} />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            Ton profil n&apos;est pas encore complet.
          </p>
          <Link
            href="/inscription"
            className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Compléter mon profil
          </Link>
        </div>
      </div>
    );
  }

  const ecoleLabel = profile.schools?.name ?? "-";
  const anneeLabel = profile.annee ? ANNEE_LABELS[profile.annee] : null;

  const mode = await getMode();
  const sport = MODES[mode].sport;

  const { data: allGames } = await supabase
    .from("games")
    .select("id, slug");

  const game = allGames?.find((g) => g.slug === mode) ?? null;

  // Matchs en attente de validation par l'utilisateur (il est tagué côté adverse).
  let pendingMatches: MatchData[] = [];
  let pendingIds: string[] = [];
  const pendingCountPerMode: Partial<Record<string, number>> = {};

  const { data: opponentParts } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("profile_id", user.id)
    .eq("is_creator", false);

  const candidateIds = (opponentParts ?? []).map((p: { match_id: string }) => p.match_id);

  if (candidateIds.length > 0) {
    const { data: allPending } = await supabase
      .from("matches")
      .select("id, game_id")
      .in("id", candidateIds)
      .in("status", ["SOUMIS", "MODIFIE"]);

    // Counts par sport pour les pastilles
    for (const g of allGames ?? []) {
      pendingCountPerMode[g.slug] = (allPending ?? []).filter((m) => m.game_id === g.id).length;
    }

    pendingIds = (allPending ?? [])
      .filter((m) => m.game_id === game?.id)
      .map((m) => m.id);
  }

  if (pendingIds.length > 0) {
    const { data } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .in("id", pendingIds)
      .order("played_at", { ascending: false })
      .returns<MatchData[]>();
    pendingMatches = data ?? [];
  }

  // Historique personnel : derniers matchs du joueur, hors ceux déjà dans "À valider".
  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("profile_id", user.id);

  const allMatchIds = (parts ?? []).map((p: { match_id: string }) => p.match_id);
  const historyIds = allMatchIds.filter((id) => !pendingIds.includes(id));

  let myMatches: MatchData[] = [];
  if (historyIds.length > 0 && game) {
    const { data } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("game_id", game.id)
      .in("id", historyIds)
      .order("played_at", { ascending: false })
      .limit(10)
      .returns<MatchData[]>();
    myMatches = data ?? [];
  }

  return (
    <div>
      <div className="mb-6">
        <PageHero
          title={profile.pseudo}
          description={user.email ?? undefined}
          pendingCounts={pendingCountPerMode}
          topRightAction={
            <ProfileSettingsMenu userId={user.id} variant="icon" />
          }
        >
          <dl className="flex flex-col gap-1 text-sm text-brand-50">
            <div className="flex items-center gap-2">
              <dt className="text-brand-200">École</dt>
              <dd className="font-medium text-white">{ecoleLabel}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-brand-200">Année</dt>
              <dd className="font-medium text-white">{anneeLabel ?? "-"}</dd>
            </div>
          </dl>
          <div className="hidden md:block md:mt-4">
            <ProfileSettingsMenu userId={user.id} variant="wide" />
          </div>
        </PageHero>
      </div>

      {pendingMatches.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            À valider
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {pendingMatches.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-3">
            {pendingMatches.map((match) => {
              const leftSide = match.match_participants.find((p) => p.profile_id === user.id)?.side ?? "A";
              const action = validateMatch.bind(null, match.id, "/profil");
              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  mode={mode}
                  leftSide={leftSide}
                  validateAction={action}
                  from="profil"
                />
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Mes derniers matchs {sport}
        </h2>
        {myMatches.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucun match {sport} pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {myMatches.map((match) => {
              const leftSide = match.match_participants.find((p) => p.profile_id === user.id)?.side ?? "A";
              return <MatchCard key={match.id} match={match} mode={mode} leftSide={leftSide} from="profil" />;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
