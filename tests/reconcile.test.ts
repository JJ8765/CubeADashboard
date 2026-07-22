/**
 * RECONCILIATION against the real CubeA workbook Summary sheet.
 * ===========================================================
 * The sample seed carries the REAL rack profiles, factors and COUNTIF counts.
 * These assertions prove the TypeScript calc engine reproduces the exact numbers
 * the Excel workbook computes — the core "accuracy over polish" guarantee.
 *
 * Reference values (from CubeA_MasterCopy.xlsx):
 *   Retail    total ft³ = 1,557,569        (Retail!F18)
 *   Wholesale total ft³ = 1,380,934        (Wholesale!I15)
 *   Dock      total ft³ =    36,521.33     (Dock Racks!K6)
 *   MODs      total ft³ =   134,359.96     (Mods Summary!D14)
 *   Grand (no dock)     = 3,072,862.96     (Summary!G10)
 *   Grand (with dock)   = 3,109,384.29     (Summary!G23)
 *   Retail    table-util = 1,246,055.2     (Retail!H18, ×0.8)
 *   Wholesale table-util = 1,104,747.2     (Wholesale!K15, ×0.8)
 */

import { describe, expect, it } from "vitest";
import { buildingCapacity } from "@/domain/calc/capacity";
import { buildSampleModel } from "@/domain/sample/seed";
import type { WarehouseModel, ZoneId } from "@/domain/types";

const model = buildSampleModel();
const zoneModel = (zone: ZoneId): WarehouseModel => ({
  ...model,
  bays: model.bays.filter((b) => b.zone === zone),
});

describe("capacity reconciliation vs. workbook Summary", () => {
  it("Retail total capacity = 1,557,569 ft³", () => {
    expect(buildingCapacity(zoneModel("Retail")).totalFt).toBeCloseTo(1557569, 0);
  });
  it("Wholesale total capacity = 1,380,934 ft³", () => {
    expect(buildingCapacity(zoneModel("Wholesale")).totalFt).toBeCloseTo(1380934, 0);
  });
  it("Dock total capacity = 36,521.33 ft³", () => {
    expect(buildingCapacity(zoneModel("Dock")).totalFt).toBeCloseTo(36521.33, 1);
  });
  it("MODs total capacity = 134,359.96 ft³", () => {
    expect(buildingCapacity(zoneModel("MODs")).totalFt).toBeCloseTo(134359.96, 1);
  });

  it("Grand total WITHOUT dock = 3,072,862.96 ft³", () => {
    const noDock: WarehouseModel = { ...model, bays: model.bays.filter((b) => b.zone !== "Dock") };
    expect(buildingCapacity(noDock).totalFt).toBeCloseTo(3072862.96, 0);
  });
  it("Grand total WITH dock = 3,109,384.29 ft³", () => {
    expect(buildingCapacity(model).totalFt).toBeCloseTo(3109384.29, 0);
  });
});

describe("effective (table-utilization) reconciliation", () => {
  it("Retail effective = 1,246,055.2 ft³ (×0.8)", () => {
    expect(buildingCapacity(zoneModel("Retail")).tableUtilFt).toBeCloseTo(1246055.2, 0);
  });
  it("Wholesale effective = 1,104,747.2 ft³ (×0.8)", () => {
    expect(buildingCapacity(zoneModel("Wholesale")).tableUtilFt).toBeCloseTo(1104747.2, 0);
  });
  it("MODs effective ≈ 87,055 ft³ (pre-baked factor)", () => {
    expect(buildingCapacity(zoneModel("MODs")).tableUtilFt).toBeCloseTo(87055, -1);
  });
});
