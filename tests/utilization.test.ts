import { describe, expect, it } from "vitest";
import { allBayMetrics, buildingSummary, rollupByZone, utilizationBand } from "@/domain/calc/utilization";
import { locationKey } from "@/domain/calc/occupancy";
import { makeRackProfile } from "@/domain/calc/capacity";
import type { WarehouseModel } from "@/domain/types";

/** Tiny model: one 1000-in³ bay, factor 0.8, 400 in³ occupied. */
function model(): WarehouseModel {
  const p = makeRackProfile("T1", [{ level: "1", heightIn: 10, widthIn: 10, depthIn: 10 }]);
  p.bayVolumeIn = 1000;
  return {
    building: "A",
    profiles: { T1: p },
    factors: { "Case Reserve": { category: "Case Reserve", utilizationFactor: 0.8, recommendedFactor: 0.8 } },
    bays: [{ id: "b1", zone: "Retail", rackCode: "T1", aisle: "1", bay: "1", level: "A", position: "1", source: "excel" }],
    assignments: { b1: { bayId: "b1", department: "Division 17" } },
    rackCategoryMap: { T1: "Case Reserve" },
    inventory: {
      label: "t", building: "A", unlocatedCubicFt: 0, unlocatedUnits: 0,
      occupancy: [{ key: locationKey("1", "1", "A", "1"), aisle: "1", bay: "1", level: "A", position: "1", occupiedCubicFt: 400, units: 1 }],
    },
    meta: { isSample: true, source: "t", createdAt: "" },
  };
}

describe("dual utilization model", () => {
  const m = model();
  const [bm] = allBayMetrics(m);
  it("capacity, effective and occupied cube per bay", () => {
    expect(bm.capacityFt).toBeCloseTo(1000 / 1728, 6);
    expect(bm.effectiveFt).toBeCloseTo((1000 / 1728) * 0.8, 6);
    expect(bm.occupiedFt).toBe(400);
  });
  it("gross vs effective utilization and headroom", () => {
    expect(bm.utilizationGross).toBeCloseTo(400 / (1000 / 1728), 4); // occupied ÷ gross cap
    expect(bm.utilizationEffective).toBeCloseTo(400 / ((1000 / 1728) * 0.8), 4);
    expect(bm.headroomFt).toBeCloseTo((1000 / 1728) * 0.8 - 400, 6);
  });
});

describe("summary + rollups", () => {
  it("buildingSummary aggregates the model", () => {
    const s = buildingSummary(model());
    expect(s.bays).toBe(1);
    expect(s.assignedBays).toBe(1);
    expect(s.hasInventory).toBe(true);
  });
  it("rollupByZone groups metrics", () => {
    const r = rollupByZone(allBayMetrics(model()));
    expect(r[0].key).toBe("Retail");
    expect(r[0].bays).toBe(1);
  });
});

describe("utilization banding", () => {
  it("bands by thresholds and handles unassigned", () => {
    expect(utilizationBand(0.4)).toBe("low");
    expect(utilizationBand(0.7)).toBe("moderate");
    expect(utilizationBand(0.9)).toBe("high");
    expect(utilizationBand(0.5, { assigned: false })).toBe("none");
  });
});
