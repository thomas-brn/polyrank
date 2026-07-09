"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus } from "lucide-react";

import { createMatch, type NewMatchState } from "./actions";
import { PlayerCombobox, type Player } from "./player-combobox";

type Game = { id: string; name: string; has_score: boolean };

const MAX_PER_SIDE = 4;
const emptyPlayer = (): Player => ({ name: "", profileId: null });

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

const statInputClass =
  "w-14 rounded border border-slate-300 px-1.5 py-1 text-center text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

const FIFACHAMP_STATS = [
  { key: "cartons_rouges", label: "Cartons rouges", required: true },
  { key: "cartons_jaunes", label: "Cartons jaunes", required: true },
  { key: "retournees", label: "Retournées", required: true },
  { key: "coups_francs", label: "Coups francs directs", required: true },
  { key: "sorties_blessure", label: "Sorties sur blessure", required: true },
  { key: "fautes_sans_carton", label: "Fautes sans carton", required: false },
] as const;

export function NewMatchForm({
  games,
  myPseudo,
  myId,
}: {
  games: Game[];
  myPseudo: string;
  myId: string;
}) {
  const router = useRouter();
  const [mates, setMates] = useState<Player[]>([]);
  const [opps, setOpps] = useState<Player[]>([emptyPlayer()]);
  const [isFriendly, setIsFriendly] = useState(false);
  const [state, formAction, pending] = useActionState<NewMatchState, FormData>(
    createMatch,
    {},
  );

  const game = games[0];
  const hasScore = game?.has_score ?? false;
  const aTotal = 1 + mates.length;

  const hasTaggedOpp = opps.some((o) => o.profileId);
  const namesFilled =
    mates.every((m) => m.name.trim()) && opps.every((o) => o.name.trim());
  const canSubmit = Boolean(game?.id) && hasTaggedOpp && namesFilled;

  const usedIds = [
    myId,
    ...mates.map((m) => m.profileId),
    ...opps.map((o) => o.profileId),
  ].filter((x): x is string => Boolean(x));

  const updateAt = (
    set: React.Dispatch<React.SetStateAction<Player[]>>,
    index: number,
    player: Player,
  ) => set((list) => list.map((p, i) => (i === index ? player : p)));
  const removeAt = (
    set: React.Dispatch<React.SetStateAction<Player[]>>,
    index: number,
  ) => set((list) => list.filter((_, i) => i !== index));

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <input
        type="hidden"
        name="players"
        value={JSON.stringify({ mates, opps })}
      />

      <input type="hidden" name="game_id" value={game?.id ?? ""} />
      <input type="hidden" name="is_friendly" value={String(isFriendly)} />

      {/* Joueurs : 2 colonnes alignées */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ton camp (A) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500">Ton camp</p>
          <input
            value={myPseudo}
            disabled
            className={`${inputClass} bg-slate-100 text-slate-600`}
          />
          {mates.map((player, i) => (
            <PlayerCombobox
              key={i}
              value={player}
              required
              removable
              excludeIds={usedIds}
              onChange={(p) => updateAt(setMates, i, p)}
              onRemove={() => removeAt(setMates, i)}
            />
          ))}
          {aTotal < MAX_PER_SIDE ? (
            <button
              type="button"
              onClick={() => setMates((m) => [...m, emptyPlayer()])}
              className="flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-brand-600 hover:underline"
            >
              <Plus className="size-3.5" /> Ajouter
            </button>
          ) : null}
        </div>

        {/* Camp adverse (B) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500">Camp adverse</p>
          {opps.map((player, i) => (
            <PlayerCombobox
              key={i}
              value={player}
              required
              removable={opps.length > 1}
              excludeIds={usedIds}
              onChange={(p) => updateAt(setOpps, i, p)}
              onRemove={() => removeAt(setOpps, i)}
            />
          ))}
          {opps.length < MAX_PER_SIDE ? (
            <button
              type="button"
              onClick={() => setOpps((o) => [...o, emptyPlayer()])}
              className="flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-brand-600 hover:underline"
            >
              <Plus className="size-3.5" /> Ajouter
            </button>
          ) : null}
        </div>
      </div>

      {!hasTaggedOpp ? (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Pour ajouter un match, au moins un des adversaires doit avoir un compte, Tague-le avec <strong>@</strong>.
        </p>
      ) : null}

      {/* Résultat */}
      <div>
        <p className="text-sm font-medium">Résultat</p>
        {!game?.id ? (
          <p className="mt-1 text-xs text-slate-400">
            Choisis d&apos;abord un jeu.
          </p>
        ) : hasScore ? (
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1fr_72px_72px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <span>Statistique</span>
              <span className="text-center">Ton camp</span>
              <span className="text-center">Adverse</span>
            </div>
            <div className="grid grid-cols-[1fr_72px_72px] items-center border-t border-slate-100 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">Buts</span>
              <div className="flex justify-center">
                <input
                  name="score_a"
                  type="number"
                  min={0}
                  required
                  defaultValue={0}
                  className={statInputClass}
                />
              </div>
              <div className="flex justify-center">
                <input
                  name="score_b"
                  type="number"
                  min={0}
                  required
                  defaultValue={0}
                  className={statInputClass}
                />
              </div>
            </div>
            {FIFACHAMP_STATS.map(({ key, label, required }) => (
              <div
                key={key}
                className="grid grid-cols-[1fr_72px_72px] items-center border-t border-slate-100 px-3 py-2"
              >
                <span className="text-sm text-slate-700">
                  {label}
                  {!required && (
                    <span className="ml-1 text-xs text-slate-400">(optionnel)</span>
                  )}
                </span>
                <div className="flex justify-center">
                  <input
                    name={`stats_a_${key}`}
                    type="number"
                    min={0}
                    required={required}
                    defaultValue={0}
                    className={statInputClass}
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    name={`stats_b_${key}`}
                    type="number"
                    min={0}
                    required={required}
                    defaultValue={0}
                    className={statInputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
              <input type="radio" name="winner" value="A" className="sr-only" />
              Mon camp gagne
            </label>
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
              <input type="radio" name="winner" value="B" className="sr-only" />
              Camp adverse gagne
            </label>
          </div>
        )}
      </div>

      {/* Lieu (optionnel) */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium">
          Lieu <span className="text-slate-400">(optionnel)</span>
        </label>
        <input id="location" name="location" className={`${inputClass} mt-1`} />
      </div>

      {/* Type de match */}
      <div>
        <p className="text-sm font-medium">Type de match</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setIsFriendly(false)}
            className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
              !isFriendly
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Match classé
          </button>
          <button
            type="button"
            onClick={() => setIsFriendly(true)}
            className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
              isFriendly
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Match amical
          </button>
        </div>
        {isFriendly && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            <Info className="mt-px size-3.5 shrink-0" />
            Ce match n'influera pas le classement mais sera pris en compte dans l&apos;historique et le calcul des statistiques.
          </p>
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer le match"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
