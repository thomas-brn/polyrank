"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { PseudoField } from "@/components/pseudo-field";
import { ANNEES, EXTE_SLUG } from "@/lib/constants";
import { updateProfile, type EditState } from "./actions";

type School = { id: string; name: string; slug: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

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
    annee: string | null;
  };
}) {
  const router = useRouter();
  const [ecole, setEcole] = useState(initial.schoolId ?? "");
  const [state, formAction, pending] = useActionState<EditState, FormData>(
    updateProfile,
    {},
  );

  const selectedSchool = schools.find((s) => s.id === ecole);
  const showAnnee = ecole !== "" && selectedSchool?.slug !== EXTE_SLUG;

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
            Choisis ton école...
          </option>
          {schools.filter((s) => s.slug !== EXTE_SLUG).map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
          <option value="" disabled>
            T'es même le bienvenu si t'es pas du réseau
          </option>
            {schools.filter((s) => s.slug === EXTE_SLUG).map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
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
              Choisis ton année...
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

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
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
