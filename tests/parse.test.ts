import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbook } from "@/domain/parse/workbook";
import { parseInventory } from "@/domain/parse/inventory";
import { parseValuation } from "@/domain/parse/valuation";

/** Build a sparse row where values are placed at explicit column indices. */
function row(entries: Record<number, unknown>): unknown[] {
  const max = Math.max(...Object.keys(entries).map(Number));
  const r = new Array(max + 1).fill(null);
  for (const [i, v] of Object.entries(entries)) r[Number(i)] = v;
  return r;
}

function toBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parseWorkbook", () => {
  it("extracts profiles, factors and grid bays", () => {
    const wb = XLSX.utils.book_new();

    // Location Details — Master Table at cols S(18) T(19) U(20) V(21) W(22)
    const ld: unknown[][] = [];
    ld[2] = row({ 18: "A1", 19: "1", 20: 56, 21: 96, 22: 42 }); // row 3
    ld[3] = row({ 18: "A1", 19: "2", 20: 56, 21: 96, 22: 42 }); // row 4
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ld), "Location Details");

    // Utilization Rates — B(1) C(2) D(3) from row 5
    const ur: unknown[][] = [];
    ur[4] = row({ 1: "Case Reserve", 2: 0.8, 3: 0.8 });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ur), "Utilization Rates");

    // Retail grid — three A1 cells on row 23 (index 22), cols B/C/D
    const rt: unknown[][] = [];
    rt[22] = row({ 1: "A1", 2: "A1", 3: "A1" });
    rt[21] = row({ 1: "PH1", 2: "PH2" }); // header labels — must be ignored
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rt), "Retail");

    const { model } = parseWorkbook(toBuffer(wb), "test.xlsx");
    expect(model.profiles.A1.bayVolumeIn).toBe(225792 * 2);
    expect(model.profiles.A1.levelCount).toBe(2);
    expect(model.factors["Case Reserve"].utilizationFactor).toBe(0.8);
    expect(model.bays.filter((b) => b.rackCode === "A1").length).toBe(3);
    expect(model.rackCategoryMap.A1).toBe("Case Reserve");
    expect(model.meta.isSample).toBe(false);
  });
});

describe("parseInventory", () => {
  it("aggregates occupied cube by location and separates unlocated", () => {
    const wb = XLSX.utils.book_new();
    const s: unknown[][] = [];
    s[4] = row({ 0: "Warehouse", 3: "Building", 5: "Aisle", 33: "Quantity", 39: "Vol" }); // header row 5
    // Building A, located: qty 10 × vol 2 = 20 cube
    s[5] = row({ 0: "LA1", 3: "A", 5: "046", 6: "33", 7: "D", 8: "1", 9: "WHL", 10: "Reserve Location", 11: "51", 33: 10, 39: 2 });
    // Building A, same location again: qty 5 × vol 2 = 10 -> aggregates to 30
    s[6] = row({ 0: "LA1", 3: "A", 5: "046", 6: "33", 7: "D", 8: "1", 9: "WHL", 33: 5, 39: 2 });
    // Building A, unlocated (no aisle): qty 5 × vol 1 = 5
    s[7] = row({ 0: "LA1", 3: "A", 33: 5, 39: 1 });
    // Building E — ignored
    s[8] = row({ 0: "LA1", 3: "E", 5: "100", 33: 99, 39: 9 });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s), "Inv");

    const { snapshot } = parseInventory(toBuffer(wb), { building: "A" });
    expect(snapshot.occupancy).toHaveLength(1);
    expect(snapshot.occupancy[0].occupiedCubicFt).toBe(30);
    expect(snapshot.occupancy[0].units).toBe(15);
    expect(snapshot.unlocatedCubicFt).toBe(5);
  });
});

describe("parseValuation", () => {
  it("extracts labelled summary rows and grand total", () => {
    const wb = XLSX.utils.book_new();
    const v: unknown[][] = [
      ["Row Labels", "Sum of Ext Units", "Sum of Ext Cost", "Sum of Ext Price"],
      ["Bldg A", 2902601, 63654503.7, 435517369.99],
      ["Bldg E", 909332, 25342836.07, 129724481.19],
      ["Grand Total", 3906407, 91928208.74, 585854151.85],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(v), "Sheet1");
    const snap = parseValuation(toBuffer(wb), "val");
    expect(snap.rows.find((r) => r.label === "Bldg A")?.extCost).toBeCloseTo(63654503.7, 1);
    expect(snap.grandTotal?.extUnits).toBe(3906407);
  });
});
