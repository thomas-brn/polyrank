"use server";

import type { MatchData } from "@/components/match-card";
import { fetchMatchsPage, type MatchsFilters } from "./query";

const PAGE_SIZE = 20;

/**
 * Charge la page suivante de l'historique général à partir de `offset`.
 * Renvoie jusqu'à PAGE_SIZE + 1 lignes : la ligne sonde permet au client de
 * savoir s'il reste des matchs après celle-ci.
 */
export async function loadMoreMatchs(
  filters: MatchsFilters,
  offset: number,
): Promise<MatchData[]> {
  return fetchMatchsPage(filters, offset, offset + PAGE_SIZE);
}
