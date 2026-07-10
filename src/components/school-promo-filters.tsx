"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { ANNEES, EXTE_SLUG } from "@/lib/constants";

type School = { id: string; name: string; slug: string };

export function SchoolPromoFilters({
  schools,
  basePath,
}: {
  schools: School[];
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const school = searchParams.get("school") ?? "";
  const annee = searchParams.get("annee") ?? "";

  // Désactivé uniquement si école exté (pas de promo)
  const anneeDisabled = school === EXTE_SLUG;

  function buildUrl(newSchool: string, newAnnee: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newSchool) {
      params.set("school", newSchool);
    } else {
      params.delete("school");
    }
    if (newAnnee) {
      params.set("annee", newAnnee);
    } else {
      params.delete("annee");
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  function onSchoolChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildUrl(e.target.value, ""), { scroll: false });
  }

  function onAnneeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildUrl(school, e.target.value), { scroll: false });
  }

  const selectClass =
    "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-2">
      <select value={school} onChange={onSchoolChange} className={selectClass}>
        <option value="">Toutes les écoles</option>
        {schools
          .filter((s) => s.slug !== EXTE_SLUG)
          .map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        {schools
          .filter((s) => s.slug === EXTE_SLUG)
          .map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
      </select>
      <select
        value={anneeDisabled ? "" : annee}
        onChange={onAnneeChange}
        disabled={anneeDisabled}
        className={selectClass}
      >
        <option value="">Toutes les promos</option>
        {ANNEES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
    </div>
  );
}
