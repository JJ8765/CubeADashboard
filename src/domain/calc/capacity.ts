/**
 * Capacity calculations — TypeScript translations of the CubeA workbook formulas.
 * =============================================================================
 * Every function below documents the exact Excel formula it recreates so the
 * logic can be audited cell-by-cell against `CubeA_MasterCopy.xlsx`.
 *
 * Unit convention: the workbook works in cubic INCHES internally and divides by
 * 1728 for cubic feet. We keep the same base (inches) and expose feet via helpers.
 */

import {
  CUBIC_IN_PER_FT,
  type Bay,
  type RackLevel,
  type RackProfile,
  type UtilizationFactor,
  type WarehouseModel,
} from "../types";

// --- primitive conversions -------------------------------------------------

/** Excel: `X = U*V*W`  (Location Details!X = Height*Width*Depth). */
export function levelVolumeIn(heightIn: number, widthIn: number, depthIn: number): number {
  return heightIn * widthIn * depthIn;
}

/** Excel: `D = C/1728`  (cubic inches -> cubic feet). */
export function toCubicFt(cubicIn: number): number {
  return cubicIn / CUBIC_IN_PER_FT;
}

// --- rack profiles ---------------------------------------------------------

/**
 * Build a RackProfile from raw level dimensions.
 * Excel: bay volume = `SUM('Location Details'!$X$a:$X$b)` over the profile's levels.
 */
export function makeRackProfile(
  code: string,
  rawLevels: Array<{ level: string; heightIn: number; widthIn: number; depthIn: number }>,
): RackProfile {
  const levels: RackLevel[] = rawLevels.map((l) => ({
    ...l,
    volumeIn: levelVolumeIn(l.heightIn, l.widthIn, l.depthIn),
  }));
  const bayVolumeIn = levels.reduce((sum, l) => sum + l.volumeIn, 0);
  return { code, levels, bayVolumeIn, levelCount: levels.length };
}

// --- counts (COUNTIF over the layout grid) ---------------------------------

/**
 * Excel: `# Bays = COUNTIF($B$22:$EF$49, "A1")` — the number of grid cells
 * holding a given rack code. In the app the grid becomes the list of bays, so a
 * COUNTIF is simply the number of bays with that rackCode.
 *
 * `cad-only` bays are excluded: per the reconciliation rule, racks drawn in the
 * CAD but absent from the workbook carry NO capacity.
 */
export function bayCount(bays: Bay[], code: string): number {
  return bays.reduce((n, b) => (b.rackCode === code && b.source !== "cad-only" ? n + 1 : n), 0);
}

/** Counts per rack code across the whole building (all countable bays). */
export function countsByCode(bays: Bay[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of bays) {
    if (b.source === "cad-only") continue;
    out[b.rackCode] = (out[b.rackCode] ?? 0) + 1;
  }
  return out;
}

// --- per-code capacity roll-up (the Retail/Wholesale summary tables) --------

export interface CodeCapacity {
  code: string;
  count: number; // Excel col B/E: COUNTIF
  bayVolumeIn: number; // Excel col C/F: SUM of level volumes
  bayVolumeFt: number; // Excel col D/G: /1728
  totalVolumeIn: number; // Excel col E/H: bayVolume * count
  totalVolumeFt: number; // Excel col F/I: /1728
  /** effective (table utilization) cube, using the mapped category's factor. */
  tableUtilFt: number; // Excel col H/K: total * utilizationFactor
  recommendedFt: number; // Excel col J/L: total * recommendedFactor
}

/**
 * Recreate one row of the Retail/Wholesale summary table for a rack code.
 * Excel chain:
 *   C = SUM(levels)                     -> bayVolumeIn
 *   E = C * COUNTIF(grid, code)         -> totalVolumeIn
 *   F = E / 1728                        -> totalVolumeFt
 *   H = F * UtilizationRates!factor     -> tableUtilFt
 *   J = F * UtilizationRates!recommended-> recommendedFt
 */
export function codeCapacity(
  profile: RackProfile,
  count: number,
  factor: UtilizationFactor | undefined,
): CodeCapacity {
  const bayVolumeIn = profile.bayVolumeIn;
  const totalVolumeIn = bayVolumeIn * count;
  const totalVolumeFt = toCubicFt(totalVolumeIn);
  const uf = factor?.utilizationFactor ?? 1;
  const rf = factor?.recommendedFactor ?? 1;
  return {
    code: profile.code,
    count,
    bayVolumeIn,
    bayVolumeFt: toCubicFt(bayVolumeIn),
    totalVolumeIn,
    totalVolumeFt,
    tableUtilFt: totalVolumeFt * uf,
    recommendedFt: totalVolumeFt * rf,
  };
}

/** Capacity for a single bay (its profile's bay volume). */
export function bayCapacityFt(model: WarehouseModel, bay: Bay): number {
  if (bay.source === "cad-only") return 0;
  const p = model.profiles[bay.rackCode];
  return p ? toCubicFt(p.bayVolumeIn) : 0;
}

/** The design (factor-based) effective capacity for one bay. */
export function bayEffectiveFt(model: WarehouseModel, bay: Bay): number {
  const cap = bayCapacityFt(model, bay);
  const category = categoryForBay(model, bay);
  const uf = category ? model.factors[category]?.utilizationFactor ?? 1 : 1;
  return cap * uf;
}

/**
 * Resolve the storage category that supplies a bay's utilization factor.
 * Priority: explicit assignment.storageType -> rackCategoryMap[rackCode].
 * (The Data-Mapping page edits `rackCategoryMap`; assignments override per bay.)
 */
export function categoryForBay(model: WarehouseModel, bay: Bay): string | undefined {
  const a = model.assignments[bay.id];
  return a?.storageType ?? model.rackCategoryMap[bay.rackCode];
}

// --- building-wide capacity totals -----------------------------------------

export interface CapacityTotals {
  totalIn: number;
  totalFt: number;
  tableUtilFt: number; // effective (design factor) cube
  recommendedFt: number;
  byCode: CodeCapacity[];
}

/**
 * Full building capacity roll-up. Mirrors the per-code summary rows and their
 * SUM totals on the Retail/Wholesale sheets, generalised across all codes.
 */
export function buildingCapacity(model: WarehouseModel): CapacityTotals {
  const counts = countsByCode(model.bays);
  const byCode: CodeCapacity[] = [];
  let totalIn = 0;
  let tableUtilFt = 0;
  let recommendedFt = 0;

  for (const [code, count] of Object.entries(counts)) {
    const profile = model.profiles[code];
    if (!profile) continue; // code with no profile contributes no capacity
    const category = model.rackCategoryMap[code];
    const factor = category ? model.factors[category] : undefined;
    const cc = codeCapacity(profile, count, factor);
    byCode.push(cc);
    totalIn += cc.totalVolumeIn;
    tableUtilFt += cc.tableUtilFt;
    recommendedFt += cc.recommendedFt;
  }

  byCode.sort((a, b) => b.totalVolumeFt - a.totalVolumeFt);
  return { totalIn, totalFt: toCubicFt(totalIn), tableUtilFt, recommendedFt, byCode };
}
