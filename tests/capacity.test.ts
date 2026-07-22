import { describe, expect, it } from "vitest";
import {
  bayCount,
  codeCapacity,
  countsByCode,
  levelVolumeIn,
  makeRackProfile,
  toCubicFt,
} from "@/domain/calc/capacity";
import type { Bay, UtilizationFactor } from "@/domain/types";

describe("primitive conversions", () => {
  it("levelVolumeIn = H*W*D (Excel X=U*V*W)", () => {
    expect(levelVolumeIn(56, 96, 42)).toBe(225792);
  });
  it("toCubicFt divides by 1728 (Excel /1728)", () => {
    expect(toCubicFt(1728)).toBe(1);
    expect(toCubicFt(1274112)).toBeCloseTo(737.333, 3);
  });
});

describe("rack profile", () => {
  it("bay volume = sum of level volumes", () => {
    const p = makeRackProfile("A1", [
      { level: "1", heightIn: 56, widthIn: 96, depthIn: 42 },
      { level: "2", heightIn: 56, widthIn: 96, depthIn: 42 },
    ]);
    expect(p.bayVolumeIn).toBe(225792 * 2);
    expect(p.levelCount).toBe(2);
  });
});

describe("counts (COUNTIF)", () => {
  const bays: Bay[] = [
    { id: "1", zone: "Retail", rackCode: "A1", source: "excel" },
    { id: "2", zone: "Retail", rackCode: "A1", source: "excel" },
    { id: "3", zone: "Retail", rackCode: "R1", source: "excel" },
    { id: "4", zone: "Retail", rackCode: "A1", source: "cad-only" }, // excluded
  ];
  it("counts a code, excluding cad-only bays", () => {
    expect(bayCount(bays, "A1")).toBe(2);
    expect(countsByCode(bays)).toEqual({ A1: 2, R1: 1 });
  });
});

describe("codeCapacity row (Excel summary-row translation)", () => {
  it("reproduces the Retail A1 row", () => {
    const profile = makeRackProfile("A1", [
      { level: "1", heightIn: 1274112 / (96 * 42), widthIn: 96, depthIn: 42 },
    ]);
    profile.bayVolumeIn = 1274112; // exact bay volume from the Master Table
    const factor: UtilizationFactor = { category: "Case Reserve", utilizationFactor: 0.8, recommendedFactor: 0.8 };
    const cc = codeCapacity(profile, 1513, factor);
    expect(cc.totalVolumeIn).toBe(1927731456); // Excel E2
    expect(cc.totalVolumeFt).toBeCloseTo(1115585.333, 2); // Excel F2
    expect(cc.tableUtilFt).toBeCloseTo(892468.267, 1); // Excel H2
  });
});
