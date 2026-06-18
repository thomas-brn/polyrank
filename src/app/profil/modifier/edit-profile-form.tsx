"use client";

import { useActionState, useState } from "react";

import { PseudoField } from "@/components/pseudo-field";
import { ANNEES, EXTERNAL_VALUE } from "@/lib/constants";
import { updateProfile, type EditState } from "./actions";

type School = { id: string; name: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

export function EditProfileForm({
  schools,
  selfId,
  initial,
}: {
  schools: School[];
  selfId: string;
  initial: {
    pseudo: string;
    schoolId: string | null;
    isExternal: boolean;
    annee: string | null;
  };
}) {
  const [ecole, setEcole] = useState(
    initial.isExternal ? EXTERNAL_VALUE : (initial.schoolId ?? ""),
  );
  const [state, formAction, pending] = useActionState<EditState, FormData>(
    updateProfile,
    {},
  );

  const showAnnee = ecole !== "" && ecole !== EXTERNAL_VALUE;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div>
        <PseudoField selfId={selfId} originalPseudo={initial.pseudo} />
        <p className="mt-1 text-xs text-slate-400">
          Changement limité à une fois par mois.
        </p>
      </div>

      <div>
        <label htmlFor="ecole" className="block text-sm font-medium">
          École
        </label>
        <select
          id="ecole"
          name="ecole"
          required
          value={ecole}
          onChange={(e) => setEcole(e.target.value)}
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

      {showAnnee ? (
        <div>
          <label htmlFor="annee" className="block text-sm font-medium">
            Année
          </label>
          <select
            id="annee"
            name="annee"
            required
            defaultValue={initial.annee ?? ""}
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

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
