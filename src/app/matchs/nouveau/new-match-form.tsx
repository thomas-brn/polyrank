"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createMatch, type NewMatchState } from "./actions";
import { PlayerCombobox, type Player } from "./player-combobox";

type Game = { id: string; name: string; has_score: boolean };

const MAX_PER_SIDE = 4;
const emptyPlayer = (): Player => ({ name: "", profileId: null });

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

export function NewMatchForm({
  games,
  myPseudo,
  myId,
}: {
  games: Game[];
  myPseudo: string;
  myId: string;
}) {
  const [gameId, setGameId] = useState("");
  const [mates, setMates] = useState<Player[]>([]);
  const [opps, setOpps] = useState<Player[]>([emptyPlayer()]);
  const [state, formAction, pending] = useActionState<NewMatchState, FormData>(
    createMatch,
    {},
  );

  const game = games.find((g) => g.id === gameId);
  const hasScore = game?.has_score ?? false;
  const aTotal = 1 + mates.length;

  const hasTaggedOpp = opps.some((o) => o.profileId);
  const namesFilled =
    mates.every((m) => m.name.trim()) && opps.every((o) => o.name.trim());
  const canSubmit = Boolean(gameId) && hasTaggedOpp && namesFilled;

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
          {mates.map((player, i) => (
            <PlayerCombobox
              key={i}
              value={player}
              required
              removable
              excludeId={myId}
              onChange={(p) => updateAt(setMates, i, p)}
              onRemove={() => removeAt(setMates, i)}
            />
          ))}
          {aTotal < MAX_PER_SIDE ? (
            <button
              type="button"
              onClick={() => setMates((m) => [...m, emptyPlayer()])}
              className="flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Plus className="size-3.5" /> Ajouter
            </button>
          ) : null}
        </div>

        {/* Adversaires (B) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500">Adversaires</p>
          {opps.map((player, i) => (
            <PlayerCombobox
              key={i}
              value={player}
              required
              removable={opps.length > 1}
              excludeId={myId}
              onChange={(p) => updateAt(setOpps, i, p)}
              onRemove={() => removeAt(setOpps, i)}
            />
          ))}
          {opps.length < MAX_PER_SIDE ? (
            <button
              type="button"
              onClick={() => setOpps((o) => [...o, emptyPlayer()])}
              className="flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Plus className="size-3.5" /> Ajouter
            </button>
          ) : null}
        </div>
      </div>

      {!hasTaggedOpp ? (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Tague au moins un adversaire inscrit avec <strong>@</strong> : lui seul
          pourra valider le match.
        </p>
      ) : null}

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
        disabled={pending || !canSubmit}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer le match"}
      </button>
    </form>
  );
}
