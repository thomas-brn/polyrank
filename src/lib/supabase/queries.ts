import { cache } from "react";

import type { Mode } from "@/lib/mode";
import { createClient } from "./server";

/**
 * Requêtes de données de référence, mémoïsées pour la durée d'un seul rendu
 * serveur via `React.cache()`. Plusieurs composants (souvent dans des
 * boundaries Suspense distincts) réclament le même jeu ou la même liste
 * d'écoles pendant le même rendu : sans cache, chaque appel refrappe Postgres.
 * `cache()` déduplique par arguments et ne persiste pas entre requêtes.
 */

export type School = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

/** Id du jeu (games.id) à partir de son slug (= mode courant). */
export const getGameId = cache(async (mode: Mode): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("id")
    .eq("slug", mode)
    .single<{ id: string }>();
  return data?.id ?? null;
});

/** Toutes les écoles, triées par nom. */
export const getSchools = cache(async (): Promise<School[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("id, name, slug, color")
    .order("name");
  return (data ?? []) as School[];
});

export type UserDuo = { profile_lo: string; profile_hi: string; rating: number };

/**
 * Duos d'un joueur (triés par rating). Partagé entre le sélecteur de duo et la
 * carte Elo 2v2, qui s'affichent ensemble sur l'onglet 2v2 : sans cache, chacun
 * refetchait duo_ratings puis les profils partenaires.
 */
export const getUserDuoRatings = cache(
  async (gameId: string, userId: string): Promise<UserDuo[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("duo_ratings")
      .select("profile_lo, profile_hi, rating")
      .eq("game_id", gameId)
      .or(`profile_lo.eq.${userId},profile_hi.eq.${userId}`)
      .order("rating", { ascending: false })
      .returns<UserDuo[]>();
    return data ?? [];
  },
);

/** Pseudo de chaque partenaire de duo du joueur, indexé par id de profil. */
export const getDuoPartnerPseudos = cache(
  async (gameId: string, userId: string): Promise<Record<string, string>> => {
    const duos = await getUserDuoRatings(gameId, userId);
    const partnerIds = [
      ...new Set(duos.map((d) => (d.profile_lo === userId ? d.profile_hi : d.profile_lo))),
    ];
    if (partnerIds.length === 0) return {};
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, pseudo")
      .in("id", partnerIds)
      .returns<{ id: string; pseudo: string | null }[]>();
    return Object.fromEntries((data ?? []).map((p) => [p.id, p.pseudo ?? "?"]));
  },
);
