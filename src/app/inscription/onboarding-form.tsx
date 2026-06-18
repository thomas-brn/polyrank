"use client";

import { useActionState, useState } from "react";

import { ALCOHOL_NOTICE, ANNEES, EXTERNAL_VALUE } from "@/lib/constants";
import { completeProfile, type OnboardingState } from "./actions";

type School = { id: string; name: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

export function OnboardingForm({ schools }: { schools: School[] }) {
  const [ecole, setEcole] = useState("");
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeProfile,
    {},
  );

  const showAnnee = ecole !== "" && ecole !== EXTERNAL_VALUE;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      {/* Pseudo */}
      <div>
        <label htmlFor="pseudo" className="block text-sm font-medium">
          Pseudo
        </label>
        <input id="pseudo" name="pseudo" required className={inputClass} />
        <p className="mt-1 text-xs text-amber-600">
          ⚠️ Ton pseudo est <strong>public</strong>, évite ton nom et ton
          prénom.
        </p>
      </div>

      {/* École */}
      <div>
        <label htmlFor="ecole" className="block text-sm font-medium">
          École
        </label>
        <select
          id="ecole"
          name="ecole"
          required
          value={ecole}
          onChange={(event) => setEcole(event.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Choisis ton école…
          </option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
          <option value={EXTERNAL_VALUE}>Exté (hors réseau Polytech)</option>
        </select>
      </div>

      {/* Année (si une école est choisie) */}
      {showAnnee ? (
        <div>
          <label htmlFor="annee" className="block text-sm font-medium">
            Année
          </label>
          <select
            id="annee"
            name="annee"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Choisis ton année…
            </option>
            {ANNEES.map((annee) => (
              <option key={annee.value} value={annee.value}>
                {annee.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Majorité */}
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="is_adult"
          required
          className="mt-0.5 size-4 rounded border-slate-300"
        />
        <span>J&apos;ai plus de 18 ans.</span>
      </label>

      {/* Prévention alcool */}
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        🍺 {ALCOHOL_NOTICE}
      </p>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Créer mon profil"}
      </button>
    </form>
  );
}
