/**
 * Floor-plan geometry tests.
 * =========================
 * The layout is driven by the real workbook grid (see src/domain/layout — the
 * gridData + floorplan modules). These assertions prove every seeded bay carries
 * a real-world rectangle, stays inside the CAD-measured footprint and its own
 * zone, and that Retail bays carry the sheet's real aisle numbers — without
 * disturbing the capacity numbers, which reconcile in reconcile.test.ts.
 */

import { describe, expect, it } from "vitest";
import { buildSampleModel } from "@/domain/sample/seed";
import { BUILDING, ZONES, buildGridBays, hasGeometry } from "@/domain/layout/floorplan";

const model = buildSampleModel();

// Per-code counts the workbook COUNTIF produces; the grid must reproduce them.
const RETAIL_TOTAL = 2010;
const WHOLESALE_TOTAL = 1880;
const DOCK_TOTAL = 43;

describe("floor-plan geometry", () => {
  it("every bay carries x/y/w/h geometry", () => {
    expect(model.bays.length).toBeGreaterThan(0);
    expect(model.bays.every(hasGeometry)).toBe(true);
  });

  it("bays are flagged as excel+cad (geometry available)", () => {
    expect(model.bays.every((b) => b.source === "excel+cad")).toBe(true);
  });

  it("all geometry stays within the CAD-measured building footprint", () => {
    for (const b of model.bays) {
      expect(b.x!).toBeGreaterThanOrEqual(0);
      expect(b.y!).toBeGreaterThanOrEqual(0);
      expect(b.x! + b.w!).toBeLessThanOrEqual(BUILDING.widthFt);
      expect(b.y! + b.h!).toBeLessThanOrEqual(BUILDING.depthFt);
    }
  });

  it("each bay sits inside its own zone rectangle", () => {
    for (const b of model.bays) {
      const r = ZONES[b.zone]?.rect;
      expect(r).toBeDefined();
      expect(b.x!).toBeGreaterThanOrEqual(r!.x - 0.001);
      expect(b.y!).toBeGreaterThanOrEqual(r!.y - 0.001);
      expect(b.x! + b.w!).toBeLessThanOrEqual(r!.x + r!.w + 0.001);
      expect(b.y! + b.h!).toBeLessThanOrEqual(r!.y + r!.h + 0.001);
    }
  });
});

describe("grid → bays", () => {
  const grid = buildGridBays();

  it("grid cell counts match the workbook COUNTIF totals", () => {
    const byZone = (z: string) => grid.filter((g) => g.zone === z).length;
    expect(byZone("Retail")).toBe(RETAIL_TOTAL);
    expect(byZone("Wholesale")).toBe(WHOLESALE_TOTAL);
    expect(byZone("Dock")).toBe(DOCK_TOTAL);
  });

  it("Retail carries the sheet's real aisle numbers (PH1–PH8, 62–99)", () => {
    const aisles = new Set(grid.filter((g) => g.zone === "Retail").map((g) => g.aisle));
    expect(aisles.has("62")).toBe(true);
    expect(aisles.has("99")).toBe(true);
    expect(aisles.has("PH1")).toBe(true);
    // the old synthetic scheme ("6001") must be gone
    expect([...aisles].some((a) => a.startsWith("6001"))).toBe(false);
  });

  it("aisles run vertically: one aisle spans many rows (bay slots) at ~constant x", () => {
    const retail = grid.filter((g) => g.zone === "Retail" && g.aisle === "62");
    const xs = new Set(retail.map((g) => Math.round(g.x)));
    const bays = new Set(retail.map((g) => g.bay));
    // a vertical aisle: few distinct x columns, many distinct down-aisle bay slots
    expect(bays.size).toBeGreaterThan(xs.size);
  });
});
