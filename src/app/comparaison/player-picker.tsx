"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { NO_PLAYER } from "./constants";

export type PickedPlayer = {
  id: string;
  pseudo: string;
  schoolName: string | null;
};

type Result = { id: string; pseudo: string; schools: { name: string } | null };

/** Hauteur commune au champ vide et à la puce d'un joueur choisi. */
const SLOT_HEIGHT = "h-13";

/**
 * Deux champs de recherche (joueur A / joueur B) synchronisés avec l'URL
 * (`?a=`, `?b=`) : la comparaison reste partageable et le serveur refait le
 * rendu avec les bons joueurs. Au focus, sans saisie, on propose directement
 * les joueurs les mieux classés pour que la page soit utilisable sans chercher.
 */
export function PlayerPicker({
  playerA,
  playerB,
  suggestions,
}: {
  playerA: PickedPlayer | null;
  playerB: PickedPlayer | null;
  suggestions: PickedPlayer[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildHref(next: { a?: string | null; b?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    return qs ? `/comparaison?${qs}` : "/comparaison";
  }

  function setSlot(slot: "a" | "b", id: string | null) {
    const next: { a?: string | null; b?: string | null } = { [slot]: id };
    // Le joueur A peut être implicite (soi-même, absent de l'URL) : on
    // l'inscrit au premier choix pour garder un lien partageable.
    if (slot === "b" && !searchParams.get("a") && playerA) next.a = playerA.id;
    router.replace(buildHref(next), { scroll: false });
  }

  function swap() {
    router.replace(
      buildHref({ a: playerB?.id ?? NO_PLAYER, b: playerA?.id ?? null }),
      { scroll: false },
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
      <Slot
        player={playerA}
        excludeId={playerB?.id}
        placeholder="Joueur A"
        suggestions={suggestions}
        align="left"
        onPick={(id) => setSlot("a", id)}
        onClear={() => setSlot("a", NO_PLAYER)}
      />

      <button
        type="button"
        onClick={swap}
        disabled={!playerA && !playerB}
        aria-label="Intervertir les deux joueurs"
        className={`${SLOT_HEIGHT} flex w-5 shrink-0 cursor-pointer items-center justify-center text-slate-300 transition-colors hover:text-slate-500 disabled:cursor-default disabled:text-slate-200`}
      >
        <ArrowLeftRight className="size-5" aria-hidden />
      </button>

      <Slot
        player={playerB}
        excludeId={playerA?.id}
        placeholder="Joueur B"
        suggestions={suggestions}
        align="right"
        onPick={(id) => setSlot("b", id)}
        onClear={() => setSlot("b", null)}
      />
    </div>
  );
}

function Slot({
  player,
  excludeId,
  placeholder,
  suggestions,
  align,
  onPick,
  onClear,
}: {
  player: PickedPlayer | null;
  excludeId?: string;
  placeholder: string;
  suggestions: PickedPlayer[];
  align: "left" | "right";
  onPick: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  // Les résultats gardent la requête d'origine : on peut ainsi afficher les
  // précédents pendant la frappe sans jamais vider l'état depuis un effet.
  const [results, setResults] = useState<{ query: string; rows: Result[] }>({
    query: "",
    rows: [],
  });
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) return;
    let active = true;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, schools(name)")
        .ilike("pseudo", `%${q}%`)
        .not("pseudo", "is", null)
        .limit(8);
      if (!active) return;
      setResults({ query: q, rows: (data ?? []) as unknown as Result[] });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, excludeId]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (player) {
    return (
      <div
        className={`${SLOT_HEIGHT} flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-slate-900">
            {player.pseudo}
          </span>
          <span className="block truncate text-[10px] leading-tight text-slate-400">
            {player.schoolName ?? "-"}
          </span>
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Retirer ${player.pseudo}`}
          className="shrink-0 cursor-pointer rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  const typing = query.trim().length > 0;
  const options: PickedPlayer[] = (
    typing
      ? results.rows.map((r) => ({
          id: r.id,
          pseudo: r.pseudo,
          schoolName: r.schools?.name ?? null,
        }))
      : suggestions
  ).filter((option) => option.id !== excludeId);
  const searching = typing && results.query !== query.trim();

  return (
    <div className="relative" ref={boxRef}>
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${SLOT_HEIGHT} w-full rounded-xl border border-slate-300 pr-2 pl-8 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200`}
      />
      {open ? (
        <div
          className={`absolute z-30 mt-1 w-[min(15rem,75vw)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {!typing ? (
            <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Mieux classés
            </p>
          ) : null}
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">
              {searching
                ? "Recherche..."
                : typing
                  ? "Aucun joueur trouvé"
                  : "Aucun joueur classé"}
            </p>
          ) : (
            <ul>
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      onPick(option.id);
                    }}
                    className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium">{option.pseudo}</span>
                    {option.schoolName ? (
                      <span className="ml-1 text-slate-400">
                        - {option.schoolName}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
