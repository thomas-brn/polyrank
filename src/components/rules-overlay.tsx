"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Mode } from "@/lib/mode";

import { CoinCoinRules } from "./rules/coincoin-rules";
import { FifaChampRules } from "./rules/fifachamp-rules";

export function RulesOverlay({ mode }: { mode: Mode }) {
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
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-shadow hover:shadow-sm w-full"
      >
        <h2 className="font-semibold">Règles du jeu</h2>
        <p className="mt-1 text-sm text-slate-500">
          Comment ça marche ? Toutes les règles expliquées.
        </p>
      </button>

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
              <h2 className="font-semibold text-slate-900">Règles du jeu</h2>
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
              {mode === "fifachamp" ? <FifaChampRules /> : <CoinCoinRules />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
