/**
 * Inventory parser — "Inv Valuation by Building - Detail" .xlsx -> occupancy.
 * =========================================================================
 * Turns the per-SKU-per-location export into an InventorySnapshot: occupied cube
 * aggregated to each physical location key. This is the "actual used capacity"
 * layer the CubeA workbook lacks.
 *
 * Occupied cube per line = Quantity × Volume(ft³-per-unit).
 * Column layout (0-based) confirmed from the real file's header row (row 5):
 *   0 Warehouse   3 Building   4 Zone   5 Aisle   6 Bay   7 Level   8 Position
 *   9 LocationType 10 LocationClass 11 ProductDivision
 *   33 Quantity   35 ExtPrice 36 ExtCost   39 Volume(Cubic Ft)
 */

import * as XLSX from "xlsx";
import { locationKey } from "../calc/occupancy";
import type { InventorySnapshot, LocationOccupancy } from "../types";

const COL = {
  warehouse: 0,
  building: 3,
  zone: 4,
  aisle: 5,
  bay: 6,
  level: 7,
  position: 8,
  locationType: 9,
  locationClass: 10,
  productDivision: 11,
  quantity: 33,
  extPrice: 35,
  extCost: 36,
  volumeFt: 39,
} as const;

const str = (v: unknown): string | undefined => {
  if (v == null || v === "") return undefined;
  return String(v).trim();
};
const num = (v: unknown): number => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

/** Locate the header row ("Warehouse … Building …") within the first ~15 rows. */
function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const r = rows[i];
    if (r && String(r[COL.warehouse]).toLowerCase() === "warehouse") return i;
  }
  return 4; // observed default (row 5, 0-based 4)
}

export interface ParseInventoryOptions {
  building?: string; // default "A" (CubeA)
  label?: string;
  asOf?: string;
}

export interface ParseInventoryResult {
  snapshot: InventorySnapshot;
  warnings: string[];
}

export function parseInventory(data: ArrayBuffer, opts: ParseInventoryOptions = {}): ParseInventoryResult {
  const building = opts.building ?? "A";
  const wb = XLSX.read(data, { type: "array", dense: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true });
  const warnings: string[] = [];

  const headerRow = findHeaderRow(rows);
  const agg = new Map<string, LocationOccupancy>();
  let unlocatedCubicFt = 0;
  let unlocatedUnits = 0;
  let matchedBuilding = 0;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r[COL.warehouse] == null) continue;
    if (str(r[COL.building]) !== building) continue;
    matchedBuilding++;

    const qty = num(r[COL.quantity]);
    const volFt = num(r[COL.volumeFt]);
    const occ = qty * volFt; // extended cube for this line

    const aisle = str(r[COL.aisle]);
    if (!aisle) {
      unlocatedCubicFt += occ;
      unlocatedUnits += qty;
      continue;
    }
    const bay = str(r[COL.bay]);
    const level = str(r[COL.level]);
    const position = str(r[COL.position]);
    const key = locationKey(aisle, bay, level, position);

    let entry = agg.get(key);
    if (!entry) {
      entry = {
        key,
        aisle,
        bay,
        level,
        position,
        locationType: str(r[COL.locationType]),
        locationClass: str(r[COL.locationClass]),
        productDivision: str(r[COL.productDivision]),
        occupiedCubicFt: 0,
        units: 0,
        extendedCost: 0,
        extendedPrice: 0,
      };
      agg.set(key, entry);
    }
    entry.occupiedCubicFt += occ;
    entry.units += qty;
    entry.extendedCost = (entry.extendedCost ?? 0) + num(r[COL.extCost]);
    entry.extendedPrice = (entry.extendedPrice ?? 0) + num(r[COL.extPrice]);
  }

  if (matchedBuilding === 0) warnings.push(`No rows found for building "${building}".`);

  const snapshot: InventorySnapshot = {
    label: opts.label ?? "Inventory snapshot",
    asOf: opts.asOf,
    building,
    occupancy: [...agg.values()],
    unlocatedCubicFt,
    unlocatedUnits,
  };
  return { snapshot, warnings };
}
