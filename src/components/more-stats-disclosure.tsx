"use client";

import { useEffect, useState } from "react";

/**
 * Remplace un <details>/<summary> natif : sur mobile Safari, l'ouverture
 * d'un <details> casse le rendu des éléments position:fixed (ex. la nav du
 * bas) le temps d'un scroll. On gère donc l'ouverture nous-mêmes.
 */
export function MoreStatsDisclosure({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {open ? <div className="flex flex-col gap-3">{children}</div> : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex cursor-pointer items-center justify-center gap-1 text-[13px] font-medium text-slate-400 hover:text-slate-600 select-none"
      >
        <span>{open ? "Moins de statistiques" : "Plus de statistiques"}</span>
        <svg
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
