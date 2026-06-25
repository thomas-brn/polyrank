"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

type Availability = "checking" | "available" | "taken" | null;

export function PseudoField({
  selfId,
  originalPseudo = "",
}: {
  selfId: string | null;
  originalPseudo?: string;
}) {
  const [value, setValue] = useState(originalPseudo);
  const [availability, setAvailability] = useState<Availability>(null);

  const trimmed = value.trim();
  const isEmpty = trimmed.length === 0;
  // Lettres (accents inclus), chiffres, - et _
  const PSEUDO_RE = /^[a-zA-Z0-9À-ɏ_-]+$/;
  const hasInvalidChars = trimmed.length > 0 && !PSEUDO_RE.test(trimmed);
  const isCurrent =
    originalPseudo.length > 0 &&
    trimmed.toLowerCase() === originalPseudo.toLowerCase();

  useEffect(() => {
    if (isEmpty || isCurrent || hasInvalidChars) return;
    let active = true;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("pseudo", trimmed)
        .limit(2);
      if (!active) return;
      const taken = (data ?? []).some((r) => r.id !== selfId);
      setAvailability(taken ? "taken" : "available");
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmed, isEmpty, isCurrent, selfId]);

  function handleChange(next: string) {
    setValue(next);
    const t = next.trim();
    const current =
      originalPseudo.length > 0 &&
      t.toLowerCase() === originalPseudo.toLowerCase();
    setAvailability(t.length > 0 && !current ? "checking" : null);
  }

  return (
    <div>
      <label htmlFor="pseudo" className="block text-sm font-medium">
        Pseudo
      </label>
      <input
        id="pseudo"
        name="pseudo"
        required
        minLength={2}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={inputClass}
      />
      {isEmpty ? null : hasInvalidChars ? (
        <p className="mt-1 text-xs text-red-600">
          Lettres, chiffres, - et _ uniquement.
        </p>
      ) : isCurrent ? (
        <p className="mt-1 text-xs text-slate-400">Ton pseudo actuel.</p>
      ) : availability === "checking" ? (
        <p className="mt-1 text-xs text-slate-400">Vérification…</p>
      ) : availability === "available" ? (
        <p className="mt-1 text-xs text-green-600">✓ Disponible</p>
      ) : availability === "taken" ? (
        <p className="mt-1 text-xs text-red-600">✗ Déjà pris</p>
      ) : null}
    </div>
  );
}
