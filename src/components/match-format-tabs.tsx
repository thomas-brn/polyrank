"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Mode } from "@/lib/mode";

export type MatchFormat = "global" | "1v1" | "2v2";

const FORMAT_TABS: Record<Mode, { key: MatchFormat; label: string }[]> = {
  fifachamp: [
    { key: "global", label: "Global" },
    { key: "1v1", label: "1v1" },
    { key: "2v2", label: "2v2" },
  ],
  coincoin: [
    { key: "global", label: "Global" },
    { key: "1v1", label: "1v1" },
    { key: "2v2", label: "2v2" },
  ],
};

export function MatchFormatTabs({
  current,
  basePath,
  mode,
}: {
  current: MatchFormat;
  basePath: string;
  mode: Mode;
}) {
  const searchParams = useSearchParams();

  function buildHref(key: MatchFormat) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "global") {
      params.delete("format");
    } else {
      params.set("format", key);
    }
    // Réinitialise le partenaire duo si on quitte le tab 2v2
    if (key !== "2v2") params.delete("duo");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const tabs = FORMAT_TABS[mode];

  return (
    <div className="flex border-b border-slate-200">
      {tabs.map(({ key, label }) => (
        <Link
          key={key}
          href={buildHref(key)}
          scroll={false}
          replace
          className={`relative flex flex-1 items-center justify-center py-2.5 text-sm font-semibold transition-colors ${
            current === key
              ? "text-brand-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {label}
          {current === key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600" />
          )}
        </Link>
      ))}
    </div>
  );
}
