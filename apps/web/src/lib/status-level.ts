import type { Status } from "./types";

/** How a criterion's status reads on a three-step scale. Nothing here is a score: it is the engine's own status, drawn. */
export const STATUS_LEVEL: Record<Status, number> = { nyaman: 3, cukup: 2, kurang: 1, belum_ada_data: 0, tidak_dinilai: 0 };

export const STATUS_TONE_CLASS: Record<Status, string> = {
  nyaman: "bg-[var(--cocok-edge)]",
  cukup: "bg-[var(--bisa-edge)]",
  kurang: "bg-[var(--kurang-edge)]",
  belum_ada_data: "bg-line-strong",
  tidak_dinilai: "bg-line-strong",
};

export interface RadarGeometry {
  size: number;
  rings: number[];
  axes: { x: number; y: number; labelX: number; labelY: number; anchor: "start" | "middle" | "end" }[];
  /** One polygon per series, as an SVG points string. */
  polygons: string[];
}

/**
 * The shape of a radar chart: where each axis ends, and the polygon of each series (values 0 to max).
 * Axis 0 points straight up and the rest follow clockwise. Needs at least three axes to be a shape.
 */
export function radarGeometry(series: readonly (readonly number[])[], axes: number, max = 3, size = 260): RadarGeometry {
  const center = size / 2;
  const radius = size / 2 - 52;
  const point = (index: number, fraction: number, extra = 0) => {
    const angle = -Math.PI / 2 + (index / axes) * Math.PI * 2;
    const reach = radius * fraction + extra;
    return { x: center + Math.cos(angle) * reach, y: center + Math.sin(angle) * reach, cos: Math.cos(angle) };
  };
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    size,
    rings: Array.from({ length: max }, (_, ring) => ((ring + 1) / max) * radius),
    axes: Array.from({ length: axes }, (_, index) => {
      const end = point(index, 1);
      const label = point(index, 1, 14);
      return {
        x: round(end.x),
        y: round(end.y),
        labelX: round(label.x),
        labelY: round(label.y),
        anchor: Math.abs(end.cos) < 0.2 ? "middle" : end.cos > 0 ? "start" : "end",
      };
    }),
    polygons: series.map((values) =>
      values
        .slice(0, axes)
        .map((value, index) => {
          const spot = point(index, Math.min(Math.max(value, 0), max) / max);
          return `${round(spot.x)},${round(spot.y)}`;
        })
        .join(" "),
    ),
  };
}
