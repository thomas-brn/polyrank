"use client";

import { useActionState } from "react";

import { requestDeletion, type DeletionState } from "./actions";

const textareaClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function DeletionForm({ matchId }: { matchId: string }) {
  const [state, formAction, pending] = useActionState<DeletionState, FormData>(
    requestDeletion,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="match_id" value={matchId} />

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
          Pourquoi ce match devrait-il être supprimé ?
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={4}
          required
          minLength={10}
          maxLength={500}
          placeholder="Ex. : ce match n'a jamais eu lieu, doublon avec un autre match..."
          className={`${textareaClass} mt-1`}
        />
        <p className="mt-1 text-xs text-slate-400">
          Un admin examinera ta demande et tranchera.
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Envoi en cours..." : "Envoyer la demande de suppression"}
      </button>
    </form>
  );
}
