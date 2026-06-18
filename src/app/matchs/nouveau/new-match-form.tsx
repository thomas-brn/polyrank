"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";

import { createMatch, type NewMatchState } from "./actions";

type Game = { id: string; name: string; has_score: boolean };

const MAX_PER_SIDE = 4;

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

export function NewMatchForm({
  games,
  myPseudo,
}: {
  games: Game[];
  myPseudo: string;
}) {
  const [gameId, setGameId] = useState("");
  const [mates, setMates] = useState<string[]>([]);
  const [opps, setOpps] = useState<string[]>([""]);
  const [state, formAction, pending] = useActionState<NewMatchState, FormData>(
    createMatch,
    {},
  );

  const game = games.find((g) => g.id === gameId);
  const hasScore = game?.has_score ?? false;
  const aTotal = 1 + mates.length;

  const updateAt = (
    set: typeof setMates,
    index: number,
    value: string,
  ) => set((list) => list.map((v, i) => (i === index ? value : v)));
  const removeAt = (set: typeof setMates, index: number) =>
    set((list) => list.filter((_, i) => i !== index));

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      {/* Jeu */}
      <fieldset>
        <legend className="text-sm font-medium">Jeu</legend>
        <div className="mt-2 flex gap-2">
          {games.map((g) => (
            <label
              key={g.id}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                gameId === g.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="game_id"
                value={g.id}
                checked={gameId === g.id}
                onChange={() => setGameId(g.id)}
                className="sr-only"
              />
              {g.name}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Joueurs : 2 colonnes alignées */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ton équipe (A) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500">Ton équipe</p>
          <input
            value={myPseudo}
            disabled
            className={`${inputClass} bg-slate-100 text-slate-600`}
          />
          {mates.map((value, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                name="mate"
                value={value}
                onChange={(e) => updateAt(setMates, i, e.target.value)}
                placeholder="Coéquipier"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeAt(setMates, i)}
                aria-label="Retirer"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {aTotal < MAX_PER_SIDE ? (
            <button
              type="button"
              onClick={() => setMates((m) => [...m, ""])}
              className="flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Plus className="size-3.5" /> Ajouter
            </button>
          ) : null}
        </div>

        {/* Adversaires (B) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500">Adversaires</p>
          {opps.map((value, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                name="opp"
                value={value}
                required={i === 0}
                onChange={(e) => updateAt(setOpps, i, e.target.value)}
                placeholder="Pseudo ou nom"
                className={inputClass}
              />
              {opps.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeAt(setOpps, i)}
                  aria-label="Retirer"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
          {opps.length < MAX_PER_SIDE ? (
            <button
              type="button"
              onClick={() => setOpps((o) => [...o, ""])}
              className="flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Plus className="size-3.5" /> Ajouter
            </button>
          ) : null}
        </div>
      </div>

      {/* Résultat */}
      <div>
        <p className="text-sm font-medium">Résultat</p>
        {!gameId ? (
          <p className="mt-1 text-xs text-slate-400">
            Choisis d&apos;abord un jeu.
          </p>
        ) : hasScore ? (
          <div className="mt-2 flex items-end gap-3">
            <label className="flex-1 text-xs text-slate-500">
              Ton camp
              <input
                name="score_a"
                type="number"
                min={0}
                required
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Adverse
              <input
                name="score_b"
                type="number"
                min={0}
                required
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium has-[:checked]:border-green-500 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
              <input type="radio" name="winner" value="A" className="sr-only" />
              Mon camp gagne
            </label>
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium has-[:checked]:border-green-500 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
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

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer le match"}
      </button>
    </form>
  );
}
