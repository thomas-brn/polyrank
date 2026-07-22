"use server";

import type { MatchData } from "@/components/match-card";
import { fetchUserMatchsPage, type UserMatchsFilters } from "@/lib/user-matchs";

const PAGE_SIZE = 20;

/**
 * Charge la page suivante de l'historique d'un joueur à partir de `offset`.
 * Renvoie jusqu'à PAGE_SIZE + 1 lignes : la ligne sonde permet au client de
 * savoir s'il reste des matchs après celle-ci.
 */
export async function loadMoreMatches(
  filters: UserMatchsFilters,
  offset: number,
): Promise<MatchData[]> {
  return fetchUserMatchsPage(filters, offset, offset + PAGE_SIZE);
}
