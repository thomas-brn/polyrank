"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export const PERIODS = [
  { key: "all", label: "Tout" },
  { key: "season", label: "Saison" },
  { key: "month", label: "Mois" },
  { key: "week", label: "Sem." },
] as const;

export type Period = (typeof PERIODS)[number]["key"];

export function PeriodTabs({
  current,
  basePath,
  /** Paramètres d'URL supplémentaires à conserver en changeant de période. */
  preserve = [],
}: {
  current: Period;
  basePath: string;
  preserve?: string[];
}) {
  const searchParams = useSearchParams();
  const format = searchParams.get("format");

  function buildHref(key: string) {
    const params = new URLSearchParams();
    if (key !== "all") params.set("period", key);
    if (format) params.set("format", format);
    for (const name of preserve) {
      const value = searchParams.get(name);
      if (value) params.set(name, value);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex gap-1.5">
      {PERIODS.map(({ key, label }) => (
        <Link
          key={key}
          href={buildHref(key)}
          scroll={false}
          replace
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            current === key
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
