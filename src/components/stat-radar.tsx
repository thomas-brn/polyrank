export type RadarAxis = {
  /** Intitulé court affiché autour du radar. */
  label: string;
  a: number;
  b: number;
  /** Valeurs brutes déjà formatées, affichées sous l'intitulé. */
  aLabel: string;
  bLabel: string;
  /**
   * Valeur portée par le cercle extérieur. À défaut, l'axe est ramené au
   * meilleur des deux joueurs.
   */
  max?: number;
};

export const RADAR_COLOR_A = "var(--brand-600)";
export const RADAR_COLOR_B = "#f43f5e";

const W = 340;
const H = 272;
const CX = 170;
const CY = 130;
const R = 82;
const RINGS = [0.25, 0.5, 0.75, 1];

function point(angle: number, radius: number) {
  return {
    x: CX + Math.cos(angle) * radius,
    y: CY + Math.sin(angle) * radius,
  };
}

function polygon(angles: number[], radii: number[]): string {
  return angles
    .map((angle, i) => {
      const p = point(angle, radii[i]);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Radar de comparaison à deux séries. Chaque axe a sa propre échelle (les
 * stats n'ont pas les mêmes ordres de grandeur) : `max` fixe la valeur du
 * cercle extérieur, sinon on retombe sur le meilleur des deux joueurs. Les
 * valeurs brutes restent lisibles sous chaque intitulé.
 */
export function StatRadar({
  axes,
  nameA,
  nameB,
}: {
  axes: RadarAxis[];
  nameA: string;
  nameB: string;
}) {
  if (axes.length < 3) return null;

  const angles = axes.map(
    (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length,
  );

  const radii = (pick: (axis: RadarAxis) => number) =>
    axes.map((axis) => {
      const max = axis.max && axis.max > 0 ? axis.max : Math.max(axis.a, axis.b);
      if (max <= 0) return 0;
      // Un joueur sous le seuil de matchs peut dépasser le plafond du site :
      // on le ramène au cercle extérieur plutôt que de sortir du graphe.
      return Math.min(pick(axis) / max, 1) * R;
    });

  const radiiA = radii((axis) => axis.a);
  const radiiB = radii((axis) => axis.b);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Radar comparant ${nameA} et ${nameB}`}
      >
        {/* Toile de fond : anneaux + axes */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygon(
              angles,
              angles.map(() => R * ring),
            )}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {angles.map((angle, i) => {
          const p = point(angle, R);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        {/* Séries */}
        <polygon
          points={polygon(angles, radiiB)}
          fill={RADAR_COLOR_B}
          fillOpacity="0.12"
          stroke={RADAR_COLOR_B}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <polygon
          points={polygon(angles, radiiA)}
          fill={RADAR_COLOR_A}
          fillOpacity="0.12"
          stroke={RADAR_COLOR_A}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {angles.map((angle, i) => {
          const pa = point(angle, radiiA[i]);
          const pb = point(angle, radiiB[i]);
          return (
            <g key={i}>
              <circle cx={pb.x} cy={pb.y} r="2.4" fill={RADAR_COLOR_B} />
              <circle cx={pa.x} cy={pa.y} r="2.4" fill={RADAR_COLOR_A} />
            </g>
          );
        })}

        {/* Intitulés + valeurs brutes */}
        {axes.map((axis, i) => {
          const angle = angles[i];
          const p = point(angle, R + 16);
          const cos = Math.cos(angle);
          const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
          const baseY = p.y + (Math.sin(angle) < -0.9 ? -4 : 0);
          return (
            <text key={axis.label} textAnchor={anchor} fontSize="9.5">
              <tspan x={p.x} y={baseY} fill="#64748b">
                {axis.label}
              </tspan>
              <tspan x={p.x} y={baseY + 11} fontWeight="700">
                <tspan fill={RADAR_COLOR_A}>{axis.aLabel}</tspan>
                <tspan fill="#cbd5e1"> · </tspan>
                <tspan fill={RADAR_COLOR_B}>{axis.bLabel}</tspan>
              </tspan>
            </text>
          );
        })}
      </svg>

      <figcaption className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
        <LegendItem color={RADAR_COLOR_A} name={nameA} />
        <LegendItem color={RADAR_COLOR_B} name={nameB} />
      </figcaption>
    </figure>
  );
}

function LegendItem({ color, name }: { color: string; name: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="max-w-32 truncate font-medium">{name}</span>
    </span>
  );
}
