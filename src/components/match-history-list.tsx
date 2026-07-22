"use client";

import { useState, useTransition } from "react";
import { MatchCard, type MatchData } from "@/components/match-card";
import { loadMoreMatches } from "@/app/profil/actions";
import type { UserMatchsFilters } from "@/lib/user-matchs";

const PAGE_SIZE = 20;

export function MatchHistoryList({
  initialMatches,
  filters,
  sport,
  hasMore: initialHasMore,
}: {
  initialMatches: MatchData[];
  filters: UserMatchsFilters;
  sport: string;
  hasMore: boolean;
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const more = await loadMoreMatches(filters, matches.length);
      setMatches((prev) => [...prev, ...more.slice(0, PAGE_SIZE)]);
      setHasMore(more.length > PAGE_SIZE);
    });
  }

  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
        Aucun match de {sport} sur cette période.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {matches.map((match) => {
          const leftSide =
            match.match_participants.find((p) => p.profile_id === filters.userId)?.side ?? "A";
          return (
            <MatchCard key={match.id} match={match} mode={filters.mode} leftSide={leftSide} from="profil" />
          );
        })}
      </ul>
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isPending}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50 select-none"
        >
          {isPending ? "Chargement..." : "Voir plus de matchs"}
          {!isPending && (
            <svg className="size-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      )}
    </>
  );
}
