/**
 * Utilization & roll-ups — the dual model.
 * ========================================
 * The app expresses utilization two ways (user decision):
 *   1. OCCUPANCY  — actual used cube ÷ capacity, from the inventory snapshot.
 *   2. FACTOR     — the workbook's design utilization factor (effective ÷ gross).
 * Headroom = effective capacity (factor) − occupied cube.
 *
 * These functions are pure and operate on a WarehouseModel (+ an occupancy index).
 * They are what the Dashboard, Capacity table and map coloring consume.
 */

import {
  bayCapacityFt,
  bayEffectiveFt,
  categoryForBay,
} from "./capacity";
import { bayOccupiedFt, indexOccupancy, type OccupancyIndex } from "./occupancy";
import type { Bay, WarehouseModel } from "../types";

export interface BayMetrics {
  bayId: string;
  zone: string;
  rackCode: string;
  department?: string;
  storageType?: string;
  levelCount: number;
  capacityFt: number; // gross rack cube
  effectiveFt: number; // capacity × design factor
  occupiedFt: number; // actual used cube (0 if no inventory)
  factor: number; // effective / capacity (the design utilization factor)
  /** occupancy utilization vs gross capacity (0..1+, clamped for display upstream) */
  utilizationGross: number;
  /** occupancy utilization vs effective capacity */
  utilizationEffective: number;
  headroomFt: number; // effective − occupied
  assigned: boolean;
}

/** Compute the full metric set for one bay. */
export function bayMetrics(model: WarehouseModel, bay: Bay, idx: OccupancyIndex): BayMetrics {
  const capacityFt = bayCapacityFt(model, bay);
  const effectiveFt = bayEffectiveFt(model, bay);
  const occupiedFt = bayOccupiedFt(idx, bay);
  const a = model.assignments[bay.id];
  const factor = capacityFt > 0 ? effectiveFt / capacityFt : 0;
  return {
    bayId: bay.id,
    zone: bay.zone,
    rackCode: bay.rackCode,
    department: a?.department,
    storageType: categoryForBay(model, bay),
    levelCount: model.profiles[bay.rackCode]?.levelCount ?? 0,
    capacityFt,
    effectiveFt,
    occupiedFt,
    factor,
    utilizationGross: capacityFt > 0 ? occupiedFt / capacityFt : 0,
    utilizationEffective: effectiveFt > 0 ? occupiedFt / effectiveFt : 0,
    headroomFt: effectiveFt - occupiedFt,
    assigned: Boolean(a?.department && a.department !== "Unassigned"),
  };
}

/** Metrics for every countable bay in the model. */
export function allBayMetrics(model: WarehouseModel): BayMetrics[] {
  const idx = indexOccupancy(model.inventory);
  return model.bays
    .filter((b) => b.source !== "cad-only")
    .map((b) => bayMetrics(model, b, idx));
}

// --- roll-ups --------------------------------------------------------------

export interface UtilRollup {
  key: string;
  bays: number;
  capacityFt: number;
  effectiveFt: number;
  occupiedFt: number;
  headroomFt: number;
  /** occupancy utilization vs gross capacity for the whole group */
  utilizationGross: number;
  /** occupancy utilization vs effective capacity for the whole group */
  utilizationEffective: number;
}

/** Aggregate bay metrics by an arbitrary dimension. */
export function rollup(metrics: BayMetrics[], keyOf: (m: BayMetrics) => string): UtilRollup[] {
  const map = new Map<string, UtilRollup>();
  for (const m of metrics) {
    const k = keyOf(m) || "—";
    let r = map.get(k);
    if (!r) {
      r = {
        key: k,
        bays: 0,
        capacityFt: 0,
        effectiveFt: 0,
        occupiedFt: 0,
        headroomFt: 0,
        utilizationGross: 0,
        utilizationEffective: 0,
      };
      map.set(k, r);
    }
    r.bays += 1;
    r.capacityFt += m.capacityFt;
    r.effectiveFt += m.effectiveFt;
    r.occupiedFt += m.occupiedFt;
  }
  for (const r of map.values()) {
    r.headroomFt = r.effectiveFt - r.occupiedFt;
    r.utilizationGross = r.capacityFt > 0 ? r.occupiedFt / r.capacityFt : 0;
    r.utilizationEffective = r.effectiveFt > 0 ? r.occupiedFt / r.effectiveFt : 0;
  }
  return [...map.values()].sort((a, b) => b.capacityFt - a.capacityFt);
}

export const rollupByZone = (m: BayMetrics[]) => rollup(m, (x) => x.zone);
export const rollupByDepartment = (m: BayMetrics[]) => rollup(m, (x) => x.department ?? "Unassigned");
export const rollupByStorageType = (m: BayMetrics[]) => rollup(m, (x) => x.storageType ?? "Unmapped");
export const rollupByRackType = (m: BayMetrics[]) => rollup(m, (x) => x.rackCode);
export const rollupByLevelCount = (m: BayMetrics[]) => rollup(m, (x) => `${x.levelCount} levels`);

// --- building KPI summary --------------------------------------------------

export interface BuildingSummary {
  bays: number;
  capacityFt: number;
  effectiveFt: number;
  occupiedFt: number;
  headroomFt: number;
  utilizationGross: number;
  utilizationEffective: number;
  assignedBays: number;
  unassignedBays: number;
  assignedCapacityFt: number;
  unassignedCapacityFt: number;
  hasInventory: boolean;
}

/** The headline numbers for the dashboard KPI row. */
export function buildingSummary(model: WarehouseModel): BuildingSummary {
  const metrics = allBayMetrics(model);
  let capacityFt = 0;
  let effectiveFt = 0;
  let occupiedFt = 0;
  let assignedBays = 0;
  let assignedCapacityFt = 0;
  for (const m of metrics) {
    capacityFt += m.capacityFt;
    effectiveFt += m.effectiveFt;
    occupiedFt += m.occupiedFt;
    if (m.assigned) {
      assignedBays += 1;
      assignedCapacityFt += m.capacityFt;
    }
  }
  return {
    bays: metrics.length,
    capacityFt,
    effectiveFt,
    occupiedFt,
    headroomFt: effectiveFt - occupiedFt,
    utilizationGross: capacityFt > 0 ? occupiedFt / capacityFt : 0,
    utilizationEffective: effectiveFt > 0 ? occupiedFt / effectiveFt : 0,
    assignedBays,
    unassignedBays: metrics.length - assignedBays,
    assignedCapacityFt,
    unassignedCapacityFt: capacityFt - assignedCapacityFt,
    hasInventory: Boolean(model.inventory),
  };
}

// --- utilization color banding (shared by map + dashboard) -----------------

export type UtilBand = "low" | "moderate" | "high" | "none";

/**
 * Band a utilization ratio for coloring. Thresholds are configurable in Settings;
 * these are the defaults (green < 60% ≤ amber < 85% ≤ red).
 */
export function utilizationBand(
  ratio: number,
  opts: { assigned?: boolean; low?: number; high?: number } = {},
): UtilBand {
  const { assigned = true, low = 0.6, high = 0.85 } = opts;
  if (!assigned || ratio <= 0) return "none";
  if (ratio < low) return "low";
  if (ratio < high) return "moderate";
  return "high";
}
