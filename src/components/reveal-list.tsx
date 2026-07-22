"use client";

import { Children, useState, type ReactNode } from "react";

/**
 * Affiche au départ `step` éléments d'une liste, avec un bouton « Voir plus »
 * qui en révèle `step` de plus à chaque clic. Les éléments sont rendus côté
 * serveur et passés en enfants ; seul le nombre visible est géré côté client.
 */
export function RevealList({
  children,
  step = 50,
  className = "flex flex-col gap-2",
  label = "Voir plus",
}: {
  children: ReactNode;
  step?: number;
  className?: string;
  label?: string;
}) {
  const items = Children.toArray(children);
  const [count, setCount] = useState(step);
  const hasMore = items.length > count;

  return (
    <>
      <ol className={className}>{items.slice(0, count)}</ol>
      {hasMore && (
        <button
          onClick={() => setCount((c) => c + step)}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600 select-none"
        >
          {label}
          <svg className="size-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </>
  );
}
