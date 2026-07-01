"use client";

import Image from "next/image";
import { useOptimistic, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";

import { setMode } from "@/lib/mode-actions";
import type { Mode } from "@/lib/mode";

function BeerBottleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 511 511"
      fill="currentColor"
      aria-hidden
    >
      <g>
        <path d="M332.835,208.286l-15.364-24.583c-4.396-7.034-7.232-15.106-8.201-23.343L295.222,40.949C299.994,36.645,303,30.417,303,23.5C303,10.542,292.458,0,279.5,0h-48C218.542,0,208,10.542,208,23.5c0,6.917,3.006,13.145,7.778,17.449L201.729,160.36c-0.969,8.237-3.805,16.309-8.201,23.343l-15.364,24.583C166.281,227.299,160,249.2,160,271.621V471.5c0,21.78,17.72,39.5,39.5,39.5h112c21.78,0,39.5-17.72,39.5-39.5V271.621C351,249.2,344.719,227.299,332.835,208.286z M231.5,15h48c4.687,0,8.5,3.813,8.5,8.5s-3.813,8.5-8.5,8.5h-48c-4.687,0-8.5-3.813-8.5-8.5S226.813,15,231.5,15z M175,367h56.5c4.142,0,7.5-3.358,7.5-7.5s-3.358-7.5-7.5-7.5H175v-17h16.5c4.142,0,7.5-3.358,7.5-7.5s-3.358-7.5-7.5-7.5H175v-33h80.5c4.687,0,8.5,3.813,8.5,8.5v128c0,4.687-3.813,8.5-8.5,8.5H175V367z M336,471.5c0,13.51-10.991,24.5-24.5,24.5h-112c-13.509,0-24.5-10.99-24.5-24.5V447h80.5c12.958,0,23.5-10.542,23.5-23.5v-128c0-12.958-10.542-23.5-23.5-23.5H175v-0.379c0-19.607,5.493-38.759,15.884-55.385l15.364-24.583c5.563-8.901,9.152-19.117,10.379-29.541L230.169,47h1.331h48h1.331l13.542,115.113c1.227,10.424,4.815,20.639,10.379,29.541l15.364,24.583C330.507,232.862,336,252.014,336,271.621V471.5z" />
        <path d="M231.5,384h-16c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h16c4.142,0,7.5-3.358,7.5-7.5S235.642,384,231.5,384z" />
        <path d="M281.263,181.205c-1.826-5.59-3.095-11.345-3.773-17.105c-0.484-4.113-4.208-7.048-8.325-6.572c-4.114,0.484-7.056,4.211-6.572,8.325c0.793,6.745,2.278,13.477,4.412,20.01c1.034,3.164,3.971,5.173,7.128,5.173c0.772,0,1.557-0.12,2.33-0.373C280.399,189.377,282.549,185.143,281.263,181.205z" />
        <path d="M239.5,464h-40c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h40c4.142,0,7.5-3.358,7.5-7.5S243.642,464,239.5,464z" />
        <path d="M287.5,464h-16.005c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5H287.5c4.142,0,7.5-3.358,7.5-7.5S291.642,464,287.5,464z" />
        <path d="M293.86,206.303c-2.195-3.512-6.822-4.581-10.335-2.385c-3.512,2.195-4.58,6.822-2.385,10.335l11.839,18.943c7.209,11.535,11.02,24.822,11.02,38.425v7.882c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-7.882c0-16.417-4.599-32.453-13.3-46.375L293.86,206.303z" />
      </g>
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.65">
        <line x1="462" y1="55" x2="505" y2="22" />
        <line x1="474" y1="84" x2="507" y2="51" />
        <line x1="476" y1="114" x2="505" y2="84" />
      </g>
      <circle cx="400" cy="110" r="49" fill="none" stroke="currentColor" strokeWidth="10" />
    </svg>
  );
}

const SPORTS: {
  mode: Mode;
  label: string;
  render: () => React.ReactNode;
  MobileIcon: React.FC<{ className?: string }>;
}[] = [
  {
    mode: "fifachamp",
    label: "FifaChamp",
    render: () => (
      <Image
        src="/icon-fifachamp.svg"
        alt="FifaChamp"
        width={96}
        height={96}
        className="size-24 brightness-0 invert drop-shadow-lg"
      />
    ),
    MobileIcon: Gamepad2,
  },
  {
    mode: "coincoin",
    label: "CoinCoin",
    render: () => (
      <BeerBottleIcon className="size-24 text-white drop-shadow-lg" />
    ),
    MobileIcon: BeerBottleIcon,
  },
];

export function ModeToggle({
  current,
  pendingCounts,
}: {
  current: Mode;
  pendingCounts?: Partial<Record<string, number>>;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(
    current,
    (_: Mode, next: Mode) => next,
  );
  const [dir, setDir] = useState<"left" | "right">("right");

  const idx = SPORTS.findIndex((s) => s.mode === optimistic);
  const { render, label } = SPORTS[idx];

  function navigate(d: "left" | "right") {
    if (pending) return;
    setDir(d);
    const delta = d === "right" ? 1 : -1;
    const next = SPORTS[(idx + delta + SPORTS.length) % SPORTS.length];
    startTransition(async () => {
      addOptimistic(next.mode);
      await setMode(next.mode);
    });
  }

  function goTo(mode: Mode) {
    if (mode === optimistic || pending) return;
    const targetIdx = SPORTS.findIndex((s) => s.mode === mode);
    setDir(targetIdx > idx ? "right" : "left");
    startTransition(async () => {
      addOptimistic(mode);
      await setMode(mode);
    });
  }

  const slideClass =
    dir === "right"
      ? "animate-carousel-from-right"
      : "animate-carousel-from-left";

  return (
    <>
      {/* ── Mobile : pill segmenté pleine largeur ── */}
      <div className="-mx-6 -mb-3 w-[calc(100%+3rem)] md:hidden">
        <div className="relative flex rounded-b-xl bg-white/15 p-1 ring-1 ring-white/20">
          {/* Pilule glissante */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-1.5 w-[calc(50%-6px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              transform: `translateX(${idx === 0 ? "0" : "100%"})`,
            }}
          />
          {SPORTS.map(({ mode, label: lbl, MobileIcon }) => {
            const active = optimistic === mode;
            const count = pendingCounts?.[mode] ?? 0;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => goTo(mode)}
                aria-pressed={active}
                className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 ${
                  active ? "text-brand-700" : "text-white/80 hover:text-white"
                }`}
              >
                <MobileIcon className="size-4" />
                {lbl}
                {count > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop : carrousel avec chevrons ── */}
      <div className="hidden shrink-0 flex-col items-center gap-2 md:flex">
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => navigate("left")}
            disabled={pending}
            aria-label="Sport précédent"
            className="-mr-2 flex size-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="relative flex size-28 items-center justify-center overflow-hidden">
            <div key={optimistic} className={slideClass}>
              <div className="animate-float">{render()}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("right")}
            disabled={pending}
            aria-label="Sport suivant"
            className="-ml-2 flex size-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <p
          key={`label-${optimistic}`}
          className={`${slideClass} text-[11px] font-bold tracking-widest text-white/90 uppercase`}
        >
          {label}
        </p>
        {(() => {
          const otherSport = SPORTS.find((s) => s.mode !== optimistic);
          const otherCount = otherSport ? (pendingCounts?.[otherSport.mode] ?? 0) : 0;
          if (!otherSport || otherCount === 0) return null;
          return (
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/60 normal-case tracking-normal">
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                {otherCount > 9 ? "9+" : otherCount}
              </span>
              {otherCount > 1 ? "Litiges" : "Litige"} en attente sur un autre jeu
            </p>
          );
        })()}
      </div>
    </>
  );
}
