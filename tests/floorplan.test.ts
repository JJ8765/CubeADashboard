/**
 * Floor-plan geometry tests.
 * =========================
 * The layout is our native rebuild of the CAD arrangement (see
 * src/domain/layout/floorplan.ts). These assertions prove every seeded bay now
 * carries a real-world rectangle and that the placed geometry stays inside the
 * CAD-measured building footprint — without disturbing the capacity numbers,
 * which are covered by reconcile.test.ts.
 */

import { describe, expect, it } from "vitest";
import { buildSampleModel } from "@/domain/sample/seed";
import { BAY, BUILDING, ZONES, hasGeometry } from "@/domain/layout/floorplan";

const model = buildSampleModel();

describe("floor-plan geometry", () => {
  it("every bay carries x/y/w/h geometry", () => {
    expect(model.bays.length).toBeGreaterThan(0);
    expect(model.bays.every(hasGeometry)).toBe(true);
  });

  it("bays are flagged as excel+cad (geometry available)", () => {
    expect(model.bays.every((b) => b.source === "excel+cad")).toBe(true);
  });

  it("bay footprint matches the workbook nominal 8 ft × 3.5 ft", () => {
    const b = model.bays[0];
    expect(b.w).toBe(BAY.widthFt);
    expect(b.h).toBe(BAY.depthFt);
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
      expect(b.x!).toBeGreaterThanOrEqual(r!.x);
      expect(b.y!).toBeGreaterThanOrEqual(r!.y);
      expect(b.x! + b.w!).toBeLessThanOrEqual(r!.x + r!.w);
      expect(b.y! + b.h!).toBeLessThanOrEqual(r!.y + r!.h);
    }
  });
});
