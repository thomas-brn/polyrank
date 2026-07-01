"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Result = { id: string; pseudo: string; schools: { name: string } | null };

export function PlayerSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    let active = true;
    const timer = setTimeout(async () => {
      if (q.length < 1) {
        if (active) {
          setResults([]);
          setOpen(false);
        }
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, schools(name)")
        .ilike("pseudo", `%${q}%`)
        .not("pseudo", "is", null)
        .limit(8);
      if (!active) return;
      setResults((data ?? []) as unknown as Result[]);
      setOpen((data ?? []).length > 0);
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Rechercher un joueur..."
          className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
      </div>
      {open ? (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => router.push(`/joueurs/${r.id}`)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium">{r.pseudo}</span>
                {r.schools?.name ? (
                  <span className="ml-1 text-slate-400">- {r.schools.name}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
