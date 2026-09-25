export type EloSeries = {
  name: string;
  color: string;
  points: { rating: number; at: number }[];
};

const W = 300;
const H = 116;
const PL = 34;
const PR = 6;
const PY = 8;
/** Au-delà, on échantillonne : le tracé n'y gagne rien et le SVG s'alourdit. */
const MAX_POINTS = 160;

function niceStep(rough: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  for (const s of [1, 2, 2.5, 5, 10]) {
    if (s * mag >= rough) return s * mag;
  }
  return 10 * mag;
}

/** 4 intervalles visés, 6 graduations au maximum pour rester lisible. */
function ticksFor(min: number, max: number): number[] {
  const range = max - min || 20;
  let step = niceStep(range / 4);
  for (let guard = 0; guard < 4; guard++) {
    const count = Math.ceil(max / step) - Math.floor(min / step) + 1;
    if (count <= 6) break;
    step = niceStep(step * 1.5);
  }
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step * 0.01; v += step) out.push(Math.round(v));
  return out;
}

function sample<T>(points: T[]): T[] {
  if (points.length <= MAX_POINTS) return points;
  const stride = Math.ceil(points.length / MAX_POINTS);
  const out = points.filter((_, i) => i % stride === 0);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function smoothPath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return "";
  if (xs.length === 1) return `M${xs[0]},${ys[0]}`;
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 1; i < xs.length; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2;
    d += ` C${cpx.toFixed(1)},${ys[i - 1].toFixed(1)} ${cpx.toFixed(1)},${ys[i].toFixed(1)} ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  }
  return d;
}

/**
 * Courbes Elo de deux joueurs sur un axe de temps commun : c'est la date qui
 * positionne les points, pas leur rang, sinon deux joueurs au nombre de matchs
 * différent seraient superposés à tort.
 */
export function EloCompareChart({ series }: { series: EloSeries[] }) {
  const drawn = series.filter((s) => s.points.length >= 2);
  if (drawn.length === 0) return null;

  const all = drawn.flatMap((s) => s.points);
  const ratings = all.map((p) => p.rating);
  const ticks = ticksFor(Math.min(...ratings), Math.max(...ratings));
  const minR = ticks[0];
  const maxR = ticks[ticks.length - 1];
  const rangeR = maxR - minR || 20;

  const times = all.map((p) => p.at);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const rangeT = maxT - minT || 1;

  const toX = (at: number) => PL + ((at - minT) / rangeT) * (W - PL - PR);
  const toY = (r: number) => H - PY - ((r - minR) / rangeR) * (H - 2 * PY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution comparée des Elo">
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PL}
            y1={toY(t)}
            x2={W - PR}
            y2={toY(t)}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text
            x={PL - 5}
            y={toY(t) + 3}
            textAnchor="end"
            fontSize="8"
            fill="#94a3b8"
          >
            {Math.round(t)}
          </text>
        </g>
      ))}

      {drawn.map((s) => {
        const points = sample(s.points);
        const xs = points.map((p) => toX(p.at));
        const ys = points.map((p) => toY(p.rating));
        const last = points[points.length - 1];
        return (
          <g key={s.name}>
            <path
              d={smoothPath(xs, ys)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={toX(last.at)} cy={toY(last.rating)} r="2.6" fill={s.color} />
          </g>
        );
      })}
    </svg>
  );
}
