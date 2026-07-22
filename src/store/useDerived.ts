/**
 * Derived selectors.
 * ==================
 * Memoized bridges between the persisted model (useWarehouse) and the view state
 * (useUi). Everything the map / panel / dashboard read is computed here once and
 * shared, so a re-assignment recomputes metrics in exactly one place.
 */

import { useMemo } from "react";
import { useWarehouse } from "@/store/useWarehouse";
import { useUi, type Filters } from "@/store/useUi";
import { allBayMetrics, type BayMetrics } from "@/domain/calc/utilization";
import type { Bay, WarehouseModel } from "@/domain/types";

export interface Derived {
  model: WarehouseModel | null;
  metrics: BayMetrics[];
  metricById: Map<string, BayMetrics>;
  bayById: Map<string, Bay>;
  zones: string[];
  rackCodes: string[];
  departments: string[];
}

/** Per-bay metrics + handy indexes, recomputed only when the model changes. */
export function useDerived(): Derived {
  const model = useWarehouse((s) => s.model);
  return useMemo(() => {
    if (!model) {
      return {
        model: null,
        metrics: [],
        metricById: new Map(),
        bayById: new Map(),
        zones: [],
        rackCodes: [],
        departments: [],
      };
    }
    const metrics = allBayMetrics(model);
    const metricById = new Map(metrics.map((m) => [m.bayId, m]));
    const bayById = new Map(model.bays.map((b) => [b.id, b]));
    const zones = [...new Set(model.bays.map((b) => b.zone))];
    const rackCodes = [...new Set(model.bays.map((b) => b.rackCode))].sort();
    const departments = [
      ...new Set(
        Object.values(model.assignments)
          .map((a) => a.department)
          .filter((d): d is string => Boolean(d)),
      ),
    ].sort();
    return { model, metrics, metricById, bayById, zones, rackCodes, departments };
  }, [model]);
}

/** Does one bay pass the current filters + free-text search? */
export function bayPasses(
  bay: Bay,
  m: BayMetrics | undefined,
  filters: Filters,
  search: string,
): boolean {
  if (filters.zone !== "all" && bay.zone !== filters.zone) return false;
  if (filters.rackCode !== "all" && bay.rackCode !== filters.rackCode) return false;
  if (filters.assignment !== "all") {
    const assigned = m?.assigned ?? false;
    if (filters.assignment === "assigned" && !assigned) return false;
    if (filters.assignment === "unassigned" && assigned) return false;
  }
  const u = m?.utilizationGross ?? 0;
  if (u < filters.utilMin || u > filters.utilMax) return false;

  const q = search.trim().toLowerCase();
  if (q) {
    const hay = [bay.id, bay.aisle, bay.bay, bay.level, bay.rackCode, m?.department, bay.zone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/**
 * The set of bay ids matching the active filters/search. When nothing is
 * constrained, returns null (meaning "everything matches" — the map then skips
 * the dim treatment entirely, which is cheaper and reads cleaner).
 */
export function useMatchedIds(derived: Derived): Set<string> | null {
  const search = useUi((s) => s.search);
  const filters = useUi((s) => s.filters);
  return useMemo(() => {
    const active =
      search.trim() !== "" ||
      filters.zone !== "all" ||
      filters.rackCode !== "all" ||
      filters.assignment !== "all" ||
      filters.utilMin > 0 ||
      filters.utilMax < 1;
    if (!active) return null;
    const out = new Set<string>();
    for (const b of derived.bayById.values()) {
      if (bayPasses(b, derived.metricById.get(b.id), filters, search)) out.add(b.id);
    }
    return out;
  }, [derived, search, filters]);
}
