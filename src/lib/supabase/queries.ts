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
