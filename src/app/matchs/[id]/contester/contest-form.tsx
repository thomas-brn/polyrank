"use client";

import { useActionState } from "react";

import { contestMatch, type ContestState } from "./actions";

type FifaSideStats = {
  cartons_rouges: number;
  cartons_jaunes: number;
  retournees: number;
  coups_francs: number;
  sorties_blessure: number;
  fautes_sans_carton?: number;
};

const FIFACHAMP_STATS = [
  { key: "cartons_rouges", label: "Cartons rouges" },
  { key: "cartons_jaunes", label: "Cartons jaunes" },
  { key: "retournees", label: "Retournées" },
  { key: "coups_francs", label: "Coups francs directs" },
  { key: "sorties_blessure", label: "Sorties sur blessure" },
  { key: "fautes_sans_carton", label: "Fautes sans carton" },
] as const;

const statInputClass =
  "w-14 rounded border border-slate-300 px-1.5 py-1 text-center text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function ContestForm({
  matchId,
  hasScore,
  sideALabel,
  sideBLabel,
  initialScoreA,
  initialScoreB,
  initialWinner,
  initialStats,
}: {
  matchId: string;
  hasScore: boolean;
  sideALabel: string;
  sideBLabel: string;
  initialScoreA: number | null;
  initialScoreB: number | null;
  initialWinner: "A" | "B" | "NUL";
  initialStats: { a: FifaSideStats; b: FifaSideStats } | null;
}) {
  const [state, formAction, pending] = useActionState<ContestState, FormData>(
    contestMatch,
    {},
  );

  const statsA = initialStats?.a ?? {
    cartons_rouges: 0,
    cartons_jaunes: 0,
    retournees: 0,
    coups_francs: 0,
    sorties_blessure: 0,
  };
  const statsB = initialStats?.b ?? {
    cartons_rouges: 0,
    cartons_jaunes: 0,
    retournees: 0,
    coups_francs: 0,
    sorties_blessure: 0,
  };

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="match_id" value={matchId} />

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">
          Quel est le résultat correct ?
        </p>

        {hasScore ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1fr_72px_72px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <span>Statistique</span>
              <span className="text-center truncate">{sideALabel}</span>
              <span className="text-center truncate">{sideBLabel}</span>
            </div>
            <div className="grid grid-cols-[1fr_72px_72px] items-center border-t border-slate-100 px-3 py-2">
              <span className="min-w-0 text-sm font-medium text-slate-700">Buts</span>
              <div className="flex justify-center">
                <input
                  name="score_a"
                  type="number"
                  min={0}
                  required
                  defaultValue={initialScoreA ?? 0}
                  className={statInputClass}
                />
              </div>
              <div className="flex justify-center">
                <input
                  name="score_b"
                  type="number"
                  min={0}
                  required
                  defaultValue={initialScoreB ?? 0}
                  className={statInputClass}
                />
              </div>
            </div>
            {FIFACHAMP_STATS.map(({ key, label }) => (
              <div
                key={key}
                className="grid grid-cols-[1fr_72px_72px] items-center border-t border-slate-100 px-3 py-2"
              >
                <span className="min-w-0 text-sm text-slate-700">{label}</span>
                <div className="flex justify-center">
                  <input
                    name={`stats_a_${key}`}
                    type="number"
                    min={0}
                    defaultValue={statsA[key] ?? 0}
                    className={statInputClass}
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    name={`stats_b_${key}`}
                    type="number"
                    min={0}
                    defaultValue={statsB[key] ?? 0}
                    className={statInputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-medium has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
              <input
                type="radio"
                name="winner"
                value="A"
                defaultChecked={initialWinner === "A"}
                className="sr-only"
              />
              {sideALabel} gagne
            </label>
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-medium has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
              <input
                type="radio"
                name="winner"
                value="B"
                defaultChecked={initialWinner === "B"}
                className="sr-only"
              />
              {sideBLabel} gagne
            </label>
          </div>
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Envoi en cours..." : "Soumettre la contestation"}
      </button>
    </form>
  );
}
