/**
 * Workbook parser — CubeA_MasterCopy.xlsx  ->  WarehouseModel (capacity master).
 * ============================================================================
 * Reconstructs, from the real workbook:
 *   - Rack PROFILES from the "Location Details" Master Table (cols S:X).
 *   - Utilization FACTORS from the "Utilization Rates" sheet.
 *   - BAYS from the cell-grid layouts on Retail / Wholesale / Dock Racks.
 *
 * The COUNTIF-driven capacity math the workbook performs is NOT re-read from the
 * summary cells — it is recomputed by the calc engine from these primitives, so
 * the engine can be reconciled against the workbook's own Summary sheet.
 */

import * as XLSX from "xlsx";
import {
  makeRackProfile,
} from "../calc/capacity";
import type {
  Bay,
  RackProfile,
  UtilizationFactor,
  WarehouseModel,
  ZoneId,
} from "../types";

// Grid ranges (1-based, inclusive) discovered from the workbook analysis.
const GRIDS: Array<{ sheet: string; zone: ZoneId; r0: number; r1: number; c0: number; c1: number }> = [
  { sheet: "Retail", zone: "Retail", r0: 22, r1: 49, c0: 2, c1: 137 }, // B22:EF49
  { sheet: "Wholesale", zone: "Wholesale", r0: 21, r1: 60, c0: 1, c1: 179 }, // A21:FW60
  { sheet: "Dock Racks", zone: "Dock", r0: 19, r1: 19, c0: 3, c1: 51 }, // C19:AY19
];

const cell = (ws: XLSX.WorkSheet, r1: number, c1: number): unknown => {
  const addr = XLSX.utils.encode_cell({ r: r1 - 1, c: c1 - 1 });
  return ws[addr]?.v;
};

/** Parse the Master Table (Location Details!S:X) into rack profiles. */
function parseProfiles(wb: XLSX.WorkBook): Record<string, RackProfile> {
  const ws = wb.Sheets["Location Details"];
  if (!ws) return {};
  // Columns: S=19,T=20,U=21,V=22,W=23 (1-based).  Data begins on row 3.
  const grouped: Record<string, Array<{ level: string; heightIn: number; widthIn: number; depthIn: number }>> = {};
  for (let r = 3; r <= 400; r++) {
    const code = cell(ws, r, 19);
    if (code == null || code === "") continue;
    const height = Number(cell(ws, r, 21));
    const width = Number(cell(ws, r, 22));
    const depth = Number(cell(ws, r, 23));
    if (!isFinite(height) || !isFinite(width) || !isFinite(depth)) continue;
    const level = String(cell(ws, r, 20) ?? "");
    (grouped[String(code)] ??= []).push({ level, heightIn: height, widthIn: width, depthIn: depth });
  }
  const out: Record<string, RackProfile> = {};
  for (const [code, levels] of Object.entries(grouped)) {
    out[code] = makeRackProfile(code, levels);
  }
  return out;
}

/** Parse the "Utilization Rates" sheet into storage-category factors. */
function parseFactors(wb: XLSX.WorkBook): Record<string, UtilizationFactor> {
  const ws = wb.Sheets["Utilization Rates"];
  const out: Record<string, UtilizationFactor> = {};
  if (!ws) return out;
  // Category in col B, utilization factor col C, recommended col D. Rows ~5..14.
  for (let r = 5; r <= 20; r++) {
    const category = cell(ws, r, 2);
    const uf = Number(cell(ws, r, 3));
    const rf = Number(cell(ws, r, 4));
    if (category == null || category === "" || !isFinite(uf)) continue;
    out[String(category)] = {
      category: String(category),
      utilizationFactor: uf,
      recommendedFactor: isFinite(rf) ? rf : uf,
    };
  }
  return out;
}

/** Parse the cell-grid layouts into individual bays. */
function parseBays(wb: XLSX.WorkBook, knownCodes: Set<string>): Bay[] {
  const bays: Bay[] = [];
  for (const g of GRIDS) {
    const ws = wb.Sheets[g.sheet];
    if (!ws) continue;
    for (let r = g.r0; r <= g.r1; r++) {
      for (let c = g.c0; c <= g.c1; c++) {
        const v = cell(ws, r, c);
        if (v == null || v === "") continue;
        const code = String(v).trim();
        if (!knownCodes.has(code)) continue; // ignore aisle labels, notes, numbers
        bays.push({
          id: `${g.zone[0]}-${r}-${c}`, // stable grid-derived id (geometry added later)
          zone: g.zone,
          rackCode: code,
          source: "excel",
        });
      }
    }
  }
  return bays;
}

/**
 * Default rack-code -> storage-category map. The workbook itself applies the
 * Case Reserve factor (0.8) almost everywhere; the Data-Mapping page can refine
 * this once storage classes are confirmed against the inventory Location Class.
 */
function defaultCategoryMap(
  codes: string[],
  factors: Record<string, UtilizationFactor>,
): Record<string, string> {
  const has = (c: string) => Boolean(factors[c]);
  const pick = (...cands: string[]) => cands.find(has) ?? Object.keys(factors)[0] ?? "";
  const map: Record<string, string> = {};
  for (const code of codes) {
    if (code === "DR") map[code] = pick("Dock Racks", "Case Reserve");
    else map[code] = pick("Case Reserve", "Pallet Reserve");
  }
  return map;
}

export interface ParseWorkbookResult {
  model: WarehouseModel;
  warnings: string[];
}

/** Parse a CubeA master workbook ArrayBuffer into a WarehouseModel. */
export function parseWorkbook(data: ArrayBuffer, sourceName = "CubeA_MasterCopy.xlsx"): ParseWorkbookResult {
  const wb = XLSX.read(data, { type: "array" });
  const warnings: string[] = [];

  const profiles = parseProfiles(wb);
  if (Object.keys(profiles).length === 0) warnings.push("No rack profiles found in Location Details!S:X.");

  const factors = parseFactors(wb);
  if (Object.keys(factors).length === 0) warnings.push("No utilization factors found.");

  const knownCodes = new Set(Object.keys(profiles));
  const bays = parseBays(wb, knownCodes);
  if (bays.length === 0) warnings.push("No bays found in the layout grids.");

  const rackCategoryMap = defaultCategoryMap(Object.keys(profiles), factors);

  const model: WarehouseModel = {
    building: "A",
    profiles,
    factors,
    bays,
    assignments: {},
    rackCategoryMap,
    meta: {
      isSample: false,
      source: sourceName,
      createdAt: new Date().toISOString(),
      notes: warnings.length ? warnings.join(" ") : undefined,
    },
  };
  return { model, warnings };
}
