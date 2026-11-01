import { describe, expect, it } from "vitest";
import { radarGeometry, STATUS_LEVEL } from "./status-level";

describe("STATUS_LEVEL", () => {
  it("reads comfortable as 3, enough as 2, lacking as 1, and no data as empty", () => {
    expect([STATUS_LEVEL.nyaman, STATUS_LEVEL.cukup, STATUS_LEVEL.kurang, STATUS_LEVEL.belum_ada_data, STATUS_LEVEL.tidak_dinilai]).toEqual([3, 2, 1, 0, 0]);
  });
});

describe("radarGeometry", () => {
  it("points the first axis straight up and spaces the rest evenly", () => {
    const geometry = radarGeometry([[3, 3, 3, 3]], 4);
    expect(geometry.axes).toHaveLength(4);
    expect(geometry.axes[0].x).toBe(geometry.size / 2);
    expect(geometry.axes[0].y).toBeLessThan(geometry.size / 2);
    expect(geometry.axes[1].y).toBe(geometry.size / 2);
    expect(geometry.axes[1].x).toBeGreaterThan(geometry.size / 2);
    expect(geometry.axes[0].anchor).toBe("middle");
  });

  it("puts a full value on the axis end and zero at the centre", () => {
    const geometry = radarGeometry([[3, 0, 3, 0]], 4);
    const [first, second] = geometry.polygons[0].split(" ");
    expect(first).toBe(`${geometry.axes[0].x},${geometry.axes[0].y}`);
    expect(second).toBe(`${geometry.size / 2},${geometry.size / 2}`);
  });

  it("clamps values outside the scale and draws one ring per level", () => {
    const geometry = radarGeometry([[9, -2, 3]], 3, 3);
    expect(geometry.rings).toHaveLength(3);
    expect(geometry.polygons[0].split(" ")[0]).toBe(`${geometry.axes[0].x},${geometry.axes[0].y}`);
    expect(geometry.polygons[0].split(" ")[1]).toBe(`${geometry.size / 2},${geometry.size / 2}`);
  });
});
