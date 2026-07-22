/**
 * Occupancy calculations — actual used cube from the inventory detail export.
 * =========================================================================
 * The CubeA workbook has no real occupancy; it only models capacity and a design
 * utilization *factor*. The inventory detail file supplies the missing layer:
 * per-SKU-per-location quantity and cube. Here we aggregate that into "used cube"
 * at every roll-up level and match it onto physical bays.
 *
 * Occupied cube for an inventory line = Quantity × unit Volume(ft³).
 * (The export's Volume column is per-unit, mirroring how Ext Price = UnitPrice×Qty.)
 */

import type { Bay, InventorySnapshot, LocationOccupancy, WarehouseModel } from "../types";

/** Composite location key used to join inventory occupancy to bays. */
export function locationKey(
  aisle?: string,
  bay?: string,
  level?: string,
  position?: string,
): string {
  return [aisle ?? "", bay ?? "", level ?? "", position ?? ""].join("|");
}

/** Map an inventory `Location Type` code to a warehouse zone. */
export const DEFAULT_LOCATION_TYPE_ZONE: Record<string, string> = {
  RTL: "Retail",
  WHL: "Wholesale",
  PRT: "Retail", // pick-retail
  PRW: "Wholesale", // pick-wholesale
  D: "Dock",
  PLT: "Dock",
  NON: "Non-located",
};

export function zoneForLocationType(t?: string): string {
  if (!t) return "Unknown";
  return DEFAULT_LOCATION_TYPE_ZONE[t] ?? "Other";
}

// --- generic aggregation ---------------------------------------------------

export interface OccupancyBucket {
  key: string;
  occupiedCubicFt: number;
  units: number;
  locations: number;
}

/** Sum occupied cube grouped by an arbitrary key extractor. */
export function groupOccupancy(
  occ: LocationOccupancy[],
  keyOf: (o: LocationOccupancy) => string,
): Record<string, OccupancyBucket> {
  const out: Record<string, OccupancyBucket> = {};
  for (const o of occ) {
    const k = keyOf(o);
    const b = (out[k] ??= { key: k, occupiedCubicFt: 0, units: 0, locations: 0 });
    b.occupiedCubicFt += o.occupiedCubicFt;
    b.units += o.units;
    b.locations += 1;
  }
  return out;
}

export const occupancyByZone = (inv: InventorySnapshot) =>
  groupOccupancy(inv.occupancy, (o) => zoneForLocationType(o.locationType));

export const occupancyByClass = (inv: InventorySnapshot) =>
  groupOccupancy(inv.occupancy, (o) => o.locationClass ?? "Unclassified");

export const occupancyByDivision = (inv: InventorySnapshot) =>
  groupOccupancy(inv.occupancy, (o) => o.productDivision ?? "Unknown");

export const occupancyByAisle = (inv: InventorySnapshot) =>
  groupOccupancy(inv.occupancy, (o) => o.aisle ?? "—");

/** Total occupied cube across the snapshot (the headline "used cube"). */
export function totalOccupiedFt(inv: InventorySnapshot): number {
  return inv.occupancy.reduce((s, o) => s + o.occupiedCubicFt, 0);
}

// --- joining occupancy onto bays -------------------------------------------

/**
 * Index occupancy by exact location key AND by aisle, so we can attribute used
 * cube to a bay at whatever granularity the geometry allows. Exact-key match is
 * preferred; aisle-level is the fallback until per-position geometry exists.
 */
export interface OccupancyIndex {
  byKey: Record<string, LocationOccupancy[]>;
  byAisle: Record<string, number>; // aisle -> occupied ft³
}

export function indexOccupancy(inv?: InventorySnapshot): OccupancyIndex {
  const byKey: Record<string, LocationOccupancy[]> = {};
  const byAisle: Record<string, number> = {};
  if (!inv) return { byKey, byAisle };
  for (const o of inv.occupancy) {
    (byKey[o.key] ??= []).push(o);
    if (o.aisle) byAisle[o.aisle] = (byAisle[o.aisle] ?? 0) + o.occupiedCubicFt;
  }
  return { byKey, byAisle };
}

/** Occupied cube attributed to a single bay via its address key (exact match). */
export function bayOccupiedFt(idx: OccupancyIndex, bay: Bay): number {
  const key = locationKey(bay.aisle, bay.bay, bay.level, bay.position);
  const lines = idx.byKey[key];
  if (!lines) return 0;
  return lines.reduce((s, o) => s + o.occupiedCubicFt, 0);
}

/**
 * Reconciliation summary between the model and an inventory snapshot: how much of
 * the used cube maps to known bays vs. lands in aisles/locations we don't model.
 */
export interface OccupancyReconciliation {
  totalOccupiedFt: number;
  matchedToBayFt: number;
  matchedByAisleFt: number;
  unmatchedFt: number;
  unlocatedFt: number;
}

export function reconcileOccupancy(
  model: WarehouseModel,
  inv: InventorySnapshot,
): OccupancyReconciliation {
  const idx = indexOccupancy(inv);
  const modelAisles = new Set(model.bays.map((b) => b.aisle).filter(Boolean) as string[]);
  let matchedToBayFt = 0;
  const matchedKeys = new Set<string>();
  for (const b of model.bays) {
    const key = locationKey(b.aisle, b.bay, b.level, b.position);
    if (idx.byKey[key]) {
      matchedToBayFt += bayOccupiedFt(idx, b);
      matchedKeys.add(key);
    }
  }
  let matchedByAisleFt = 0;
  let unmatchedFt = 0;
  for (const o of inv.occupancy) {
    if (matchedKeys.has(o.key)) continue;
    if (o.aisle && modelAisles.has(o.aisle)) matchedByAisleFt += o.occupiedCubicFt;
    else unmatchedFt += o.occupiedCubicFt;
  }
  return {
    totalOccupiedFt: totalOccupiedFt(inv),
    matchedToBayFt,
    matchedByAisleFt,
    unmatchedFt,
    unlocatedFt: inv.unlocatedCubicFt,
  };
}
