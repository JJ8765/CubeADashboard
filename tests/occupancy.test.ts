import { describe, expect, it } from "vitest";
import {
  bayOccupiedFt,
  groupOccupancy,
  indexOccupancy,
  locationKey,
  reconcileOccupancy,
  totalOccupiedFt,
  zoneForLocationType,
} from "@/domain/calc/occupancy";
import type { Bay, InventorySnapshot, LocationOccupancy, WarehouseModel } from "@/domain/types";

const occ: LocationOccupancy[] = [
  { key: locationKey("046", "33", "D", "1"), aisle: "046", bay: "33", level: "D", position: "1",
    locationType: "WHL", locationClass: "Reserve Location", occupiedCubicFt: 100, units: 10 },
  { key: locationKey("046", "34", "B", "1"), aisle: "046", bay: "34", level: "B", position: "1",
    locationType: "WHL", locationClass: "Reserve Location", occupiedCubicFt: 50, units: 5 },
  { key: locationKey("900", "01", "A", "1"), aisle: "900", bay: "01", level: "A", position: "1",
    locationType: "RTL", locationClass: "Active Location", occupiedCubicFt: 25, units: 3 },
];

const inv: InventorySnapshot = {
  label: "test", building: "A", occupancy: occ, unlocatedCubicFt: 7, unlocatedUnits: 2,
};

describe("occupancy aggregation", () => {
  it("totals occupied cube", () => {
    expect(totalOccupiedFt(inv)).toBe(175);
  });
  it("groups by zone via location type", () => {
    const g = groupOccupancy(occ, (o) => zoneForLocationType(o.locationType));
    expect(g["Wholesale"].occupiedCubicFt).toBe(150);
    expect(g["Retail"].occupiedCubicFt).toBe(25);
  });
});

describe("joining occupancy to bays", () => {
  const idx = indexOccupancy(inv);
  const bay: Bay = { id: "b1", zone: "Wholesale", rackCode: "R4", aisle: "046", bay: "33", level: "D", position: "1", source: "excel" };
  it("matches a bay by exact address key", () => {
    expect(bayOccupiedFt(idx, bay)).toBe(100);
  });
  it("returns 0 for an unoccupied address", () => {
    const empty: Bay = { ...bay, bay: "99" };
    expect(bayOccupiedFt(idx, empty)).toBe(0);
  });
});

describe("reconciliation splits matched vs. unmatched cube", () => {
  const model: WarehouseModel = {
    building: "A", profiles: {}, factors: {},
    bays: [
      { id: "b1", zone: "Wholesale", rackCode: "R4", aisle: "046", bay: "33", level: "D", position: "1", source: "excel" },
      // aisle 046 known but bay 34 not modelled -> matched by aisle
    ],
    assignments: {}, rackCategoryMap: {},
    meta: { isSample: true, source: "t", createdAt: "" },
  };
  it("classifies matched-to-bay, matched-by-aisle, unmatched and unlocated", () => {
    const r = reconcileOccupancy(model, inv);
    expect(r.totalOccupiedFt).toBe(175);
    expect(r.matchedToBayFt).toBe(100); // exact bay
    expect(r.matchedByAisleFt).toBe(50); // aisle 046 bay 34
    expect(r.unmatchedFt).toBe(25); // aisle 900 not modelled
    expect(r.unlocatedFt).toBe(7);
  });
});
