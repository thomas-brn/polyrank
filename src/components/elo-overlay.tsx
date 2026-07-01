"use client";

import { Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Mode } from "@/lib/mode";

import { CoinCoinElo } from "./elo/coincoin-elo";
import { FifaChampElo } from "./elo/fifachamp-elo";

export function EloOverlay({
  mode,
  variant = "full",
}: {
  mode: Mode;
  variant?: "full" | "bubble";
}) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      scrollRef.current?.scrollTo(0, 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {variant === "bubble" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Fonctionnement des classements"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
        >
          <Info className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30"
        >
          <Info className="h-3 w-3" />
          Fonctionnement des classements
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={scrollRef}
            className="relative mt-16 flex flex-1 flex-col overflow-y-auto rounded-t-2xl bg-white"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <h2 className="font-semibold text-slate-900">Comment fonctionnent les classements ?</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-5 py-6">
              {mode === "fifachamp" ? <FifaChampElo /> : <CoinCoinElo />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
