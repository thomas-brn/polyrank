"use client";

import { useEffect, useRef, useState } from "react";
import { AtSign, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export type Player = { name: string; profileId: string | null };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

type Suggestion = { id: string; pseudo: string };

export function PlayerCombobox({
  value,
  onChange,
  onRemove,
  removable = false,
  required = false,
  excludeIds,
}: {
  value: Player;
  onChange: (player: Player) => void;
  onRemove?: () => void;
  removable?: boolean;
  required?: boolean;
  excludeIds?: string[];
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const tagged = value.profileId != null;
  const excludeKey = (excludeIds ?? []).join(",");

  useEffect(() => {
    const q = value.name.replace(/^@/, "").trim();
    const excluded = excludeKey ? excludeKey.split(",") : [];
    let active = true;
    const timer = setTimeout(async () => {
      if (tagged || q.length < 1) {
        if (active) {
          setSuggestions([]);
          setOpen(false);
        }
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo")
        .ilike("pseudo", `%${q}%`)
        .not("pseudo", "is", null)
        .limit(8);
      if (!active) return;
      const list = ((data ?? []) as Suggestion[]).filter(
        (s) => !excluded.includes(s.id),
      );
      setSuggestions(list);
      setOpen(list.length > 0);
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value.name, tagged, excludeKey]);

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
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <input
            value={value.name}
            required={required}
            onChange={(e) => onChange({ name: e.target.value, profileId: null })}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            placeholder="@pseudo ou nom"
            className={`${inputClass} ${tagged ? "border-blue-400 pr-8" : ""}`}
          />
          {tagged ? (
            <AtSign
              className="absolute top-1/2 right-2 size-4 -translate-y-1/2 text-blue-500"
              aria-label="Joueur inscrit taggé"
            />
          ) : null}
        </div>
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Retirer"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ name: s.pseudo, profileId: s.id });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <AtSign className="size-3.5 text-blue-500" />
                {s.pseudo}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
