import { radarGeometry } from "@/lib/status-level";

export interface RadarSeries {
  name: string;
  values: number[];
  /** A CSS color; the series is also told apart by its dash pattern, never by color alone. */
  color: string;
  dashed?: boolean;
}

/**
 * Two (or more) laptops over the same criteria, drawn as a radar. A value is the engine's status for that criterion
 * on the 1-3 scale (kurang, cukup, nyaman; 0 means no data), not a score. The numbers are repeated in a table that
 * only screen readers see, so the chart never holds information that exists nowhere else.
 */
export function StatusRadar({ labels, series }: { labels: string[]; series: RadarSeries[] }) {
  if (labels.length < 3) return null;
  const geometry = radarGeometry(series.map((entry) => entry.values), labels.length);
  const c = geometry.size / 2;
  const levelName = ["belum ada data", "kurang", "cukup", "nyaman"];
  return (
    <figure>
      <svg viewBox={`-50 0 ${geometry.size + 100} ${geometry.size}`} role="img" aria-label="Radar perbandingan status tiap kriteria" className="mx-auto w-full max-w-[26rem]">
        {geometry.rings.map((r, index) => (
          <circle key={r} cx={c} cy={c} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={index === geometry.rings.length - 1 ? 1.5 : 1} strokeDasharray={index === geometry.rings.length - 1 ? undefined : "3 4"} />
        ))}
        {geometry.axes.map((axis, index) => (
          <g key={labels[index]}>
            <line x1={c} y1={c} x2={axis.x} y2={axis.y} stroke="var(--line-strong)" />
            <text x={axis.labelX} y={axis.labelY} textAnchor={axis.anchor} dominantBaseline="middle" fontSize="11" fontWeight="600" fill="var(--ink-2)">
              {labels[index]}
            </text>
          </g>
        ))}
        {series.map((entry, index) => (
          <polygon key={entry.name} points={geometry.polygons[index]} fill={entry.color} fillOpacity={0.16} stroke={entry.color} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray={entry.dashed ? "6 4" : undefined} />
        ))}
      </svg>
      <figcaption className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-ink-2">
        {series.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" stroke={entry.color} strokeWidth="3" strokeDasharray={entry.dashed ? "6 4" : undefined} />
            </svg>
            {entry.name}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>Status tiap kriteria</caption>
        <thead>
          <tr>
            <th scope="col">Kriteria</th>
            {series.map((entry) => (
              <th key={entry.name} scope="col">
                {entry.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, index) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {series.map((entry) => (
                <td key={entry.name}>{levelName[entry.values[index] ?? 0]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
