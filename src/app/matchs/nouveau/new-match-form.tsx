"use client";

import { useActionState, useState } from "react";

import { createMatch, type NewMatchState } from "./actions";

type Game = { id: string; name: string; has_score: boolean };

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

const FORMATS = [
  { value: "1V1", label: "1 vs 1" },
  { value: "2V2", label: "2 vs 2" },
  { value: "1V2", label: "1 vs 2 (rare)" },
];

export function NewMatchForm({
  games,
  myPseudo,
}: {
  games: Game[];
  myPseudo: string;
}) {
  const [gameId, setGameId] = useState("");
  const [format, setFormat] = useState("1V1");
  const [state, formAction, pending] = useActionState<NewMatchState, FormData>(
    createMatch,
    {},
  );

  const game = games.find((g) => g.id === gameId);
  const hasScore = game?.has_score ?? false;
  const needsTwoOpp = format === "2V2" || format === "1V2";
  const hasMate = format === "2V2";

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

      {/* Format */}
      <div>
        <label htmlFor="format" className="block text-sm font-medium">
          Format
        </label>
        <select
          id="format"
          name="format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className={inputClass}
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Joueurs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">
            {hasMate ? "Ton équipe (A)" : "Toi (A)"}
          </p>
          <p className="mt-1 text-sm font-medium">{myPseudo}</p>
          {hasMate ? (
            <input
              name="mate"
              placeholder="Coéquipier (pseudo ou nom)"
              className={inputClass}
            />
          ) : null}
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">
            {needsTwoOpp ? "Adversaires (B)" : "Adversaire (B)"}
          </p>
          <input
            name="opp1"
            required
            placeholder="Pseudo (si inscrit) ou nom"
            className={inputClass}
          />
          {needsTwoOpp ? (
            <input
              name="opp2"
              placeholder="2ᵉ adversaire"
              className={`${inputClass} mt-2`}
            />
          ) : null}
        </div>
      </div>

      {/* Résultat */}
      <div>
        <p className="text-sm font-medium">Résultat</p>
        {!gameId ? (
          <p className="mt-1 text-xs text-slate-400">Choisis d&apos;abord un jeu.</p>
        ) : hasScore ? (
          <div className="mt-2 flex items-end gap-3">
            <label className="flex-1 text-xs text-slate-500">
              Ton camp
              <input
                name="score_a"
                type="number"
                min={0}
                required
                className={inputClass}
              />
            </label>
            <span className="pb-2 text-slate-400">–</span>
            <label className="flex-1 text-xs text-slate-500">
              Adverse
              <input
                name="score_b"
                type="number"
                min={0}
                required
                className={inputClass}
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
        <input id="location" name="location" className={inputClass} />
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
