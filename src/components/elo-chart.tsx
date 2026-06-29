"use client";

import { useState } from "react";

type HistoryPoint = { rating: number; played_at: string };
export type DuoSeries = { partnerName: string; partnerId: string; points: HistoryPoint[] };

const BRAND = "#2563eb";
const SLATE = "#94a3b8";
const GREEN = "#16a34a";

function niceStep(range: number): number {
  const rough = range / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const s of [1, 2, 5, 10]) {
    if (s * mag >= rough) return s * mag;
  }
  return 10 * mag;
}

function niceTicks(minR: number, maxR: number): number[] {
  const step = niceStep(maxR - minR || 20);
  const lo = Math.floor(minR / step) * step;
  const hi = Math.ceil(maxR / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 0.01; v += step) ticks.push(v);
  // keep at most 5 ticks
  if (ticks.length > 5) {
    const step2 = niceStep((ticks[ticks.length - 1] - ticks[0]) * 1.1);
    const lo2 = Math.floor(minR / step2) * step2;
    const hi2 = Math.ceil(maxR / step2) * step2;
    const out: number[] = [];
    for (let v = lo2; v <= hi2 + step2 * 0.01; v += step2) out.push(v);
    return out;
  }
  return ticks;
}

function chartPath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return "";
  if (xs.length === 1) return `M${xs[0]},${ys[0]}`;
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 1; i < xs.length; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2;
    d += ` C${cpx.toFixed(1)},${ys[i - 1].toFixed(1)} ${cpx.toFixed(1)},${ys[i].toFixed(1)} ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  }
  return d;
}

export function EloChart({
  globalPoints,
  v1Points,
  duoSeries = [],
}: {
  globalPoints: HistoryPoint[];
  v1Points: HistoryPoint[];
  duoSeries?: DuoSeries[];
}) {
  const validDuos = duoSeries.filter((d) => d.points.length >= 2);
  const [selectedDuoIdx, setSelectedDuoIdx] = useState<number | null>(
    validDuos.length > 0 ? 0 : null,
  );

  const duoPoints = selectedDuoIdx !== null ? (validDuos[selectedDuoIdx]?.points ?? []) : [];

  const W = 300, H = 110, PL = 36, PR = 6, PY = 8;
  const allRatings = [...globalPoints, ...v1Points, ...duoPoints].map((p) => p.rating);
  if (allRatings.length === 0) return null;

  const rawMin = Math.min(...allRatings);
  const rawMax = Math.max(...allRatings);
  const ticks = niceTicks(rawMin, rawMax);
  const minR = ticks[0];
  const maxR = ticks[ticks.length - 1];
  const rangeR = maxR - minR || 20;
  const toX = (i: number, total: number) => PL + (total <= 1 ? (W - PL - PR) / 2 : (i / (total - 1)) * (W - PL - PR));
  const toY = (r: number) => H - PY - ((r - minR) / rangeR) * (H - 2 * PY);

  const gxs = globalPoints.map((_, i) => toX(i, globalPoints.length));
  const gys = globalPoints.map((p) => toY(p.rating));
  const vxs = v1Points.map((_, i) => toX(i, v1Points.length));
  const vys = v1Points.map((p) => toY(p.rating));
  const dxs = duoPoints.map((_, i) => toX(i, duoPoints.length));
  const dys = duoPoints.map((p) => toY(p.rating));

  const hasGlobal = globalPoints.length >= 2;
  const has1v1 = v1Points.length >= 2;
  const hasDuo = duoPoints.length >= 2;

  const legendItems = [
    hasGlobal && { label: "Global", color: BRAND },
    has1v1 && { label: "1v1", color: SLATE },
    hasDuo && { label: "2v2", color: GREEN },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div>
      {/* Sélecteur de duo */}
      {validDuos.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 shrink-0" style={{ backgroundColor: GREEN }} />
          <select
            value={selectedDuoIdx ?? ""}
            onChange={(e) =>
              setSelectedDuoIdx(e.target.value === "" ? null : Number(e.target.value))
            }
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white py-0.5 pl-2 pr-6 text-[11px] text-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">— 2v2 masqué —</option>
            {validDuos.map((duo, i) => {
              const lastElo = Math.round(duo.points[duo.points.length - 1]?.rating ?? 0);
              return (
                <option key={duo.partnerId} value={i}>
                  {duo.partnerName} — {lastElo}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Légende */}
      {legendItems.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
          {legendItems.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} aria-hidden="true">
        {ticks.map((tick) => {
          const y = toY(tick);
          const isFirst = tick === minR;
          const isLast = tick === maxR;
          return (
            <g key={tick}>
              <line
                x1={PL} y1={y} x2={W - PR} y2={y}
                stroke={isFirst || isLast ? "#cbd5e1" : "#e2e8f0"}
                strokeWidth={isFirst || isLast ? "1" : "0.75"}
                strokeDasharray={isFirst || isLast ? "3 3" : "2 4"}
              />
              <text x={PL - 4} y={y + 3.5} fontSize="8" fill={isFirst || isLast ? "#64748b" : "#94a3b8"} textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}
        {has1v1 && (
          <path d={chartPath(vxs, vys)} fill="none" stroke={SLATE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {hasGlobal && (
          <path d={chartPath(gxs, gys)} fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {hasDuo && (
          <path d={chartPath(dxs, dys)} fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {hasGlobal && (
          <circle cx={gxs[gxs.length - 1]} cy={gys[gys.length - 1]} r="3" fill={BRAND} />
        )}
        {has1v1 && (
          <circle cx={vxs[vxs.length - 1]} cy={vys[vys.length - 1]} r="2.5" fill={SLATE} />
        )}
        {hasDuo && (
          <circle cx={dxs[dxs.length - 1]} cy={dys[dys.length - 1]} r="3" fill={GREEN} />
        )}
      </svg>
    </div>
  );
}
