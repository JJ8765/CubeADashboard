/**
 * Sample seed data  — CLEARLY MARKED SAMPLE.
 * =========================================
 * Capacity primitives (rack profiles, utilization factors, and per-code bay
 * counts) are the REAL values read from CubeA_MasterCopy.xlsx, so the calc engine
 * reproduces the workbook's Summary totals exactly (see tests/reconcile.test.ts).
 *
 * Physical addresses and the inventory occupancy layer are SYNTHETIC — generated
 * here so the Dashboard/Capacity screens are fully populated before any real
 * upload. Everything carries meta.isSample = true and inventory.label notes it.
 */

import { makeRackProfile } from "../calc/capacity";
import { locationKey } from "../calc/occupancy";
import { buildGridBays, modBayGeometry } from "../layout/floorplan";
import type {
  Bay,
  InventorySnapshot,
  LocationOccupancy,
  RackProfile,
  UtilizationFactor,
  WarehouseModel,
} from "../types";

// --- REAL rack profiles: [bayVolumeIn, levelCount] from the Master Table -----
// Per-level volumes are split evenly to preserve Σ (bayVolumeIn) and count; the
// engine only consumes bayVolumeIn, so capacity math stays exact.
const PROFILE_DATA: Record<string, [number, number]> = {
  A1: [1274112, 6], A4: [1935360, 5], AT: [895104, 3], A4S: [1572480, 5],
  R1: [1282176, 7], R4: [1923264, 7], G1: [1145088, 5], G4: [1717632, 5],
  B1: [1185408, 4], B4: [1741824, 4], Y1: [1257984, 7], Y3: [1693440, 5],
  L1: [1209600, 9], L4: [1814400, 9], E: [1365120, 5], E2: [649152, 6],
  A4W: [1911168, 6], X1: [1145088, 5], X4: [1717632, 5], Z1: [1064448, 4],
  Z4: [1596672, 4], DR: [1467648, 2],
};

// --- REAL utilization factors (Utilization Rates sheet) ----------------------
const FACTOR_DATA: Array<[string, number, number]> = [
  ["Pallet Reserve", 0.8, 0.8], ["Tunnels", 0.8, 0.8], ["Pallet P&H", 0.75, 0.75],
  ["Case Reserve", 0.8, 0.8], ["Pallet Active", 0.65, 0.65], ["Case Flow Active", 0.65, 0.65],
  ["Static Active", 0.65, 0.65], ["Dock Racks", 0.8, 0.8], ["Corrugate Lanes", 0.8, 0.8],
  // MODs utilization is pre-baked in the workbook; expressed as an equivalent factor.
  ["MODs", 0.64792, 0.63524],
];

// Per-code bay counts (COUNTIF over each grid) now come straight from the real
// workbook layout via buildGridBays() — see src/domain/layout/gridData.ts.

// --- REAL MOD level cubes (in³), one synthetic "bay" per level ---------------
const MOD_LEVELS: Array<[string, number]> = [
  ["MOD6-L1", 16129248], ["MOD6-L2", 29030400], ["MOD6-L3", 29030400],
  ["MOD7-L1", 24376032], ["MOD7-L2", 29721600], ["MOD7-L3", 29721600],
  ["MOD8-L1", 16380408], ["MOD8-L2", 28892160], ["MOD8-L3", 28892160],
];

// deterministic RNG so the sample is stable across reloads
let _s = 20260717;
const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

function makeSeedProfile(code: string, bayVolumeIn: number, levelCount: number): RackProfile {
  const per = bayVolumeIn / levelCount;
  // Represent as evenly-split levels of a nominal 96×42 footprint (height solves the volume).
  const levels = Array.from({ length: levelCount }, (_, i) => ({
    level: i === levelCount - 1 ? "RF" : String(i + 1),
    heightIn: per / (96 * 42),
    widthIn: 96,
    depthIn: 42,
  }));
  const p = makeRackProfile(code, levels);
  // Force exact bay volume (guards against float drift from the split).
  p.bayVolumeIn = bayVolumeIn;
  p.levelCount = levelCount;
  return p;
}

export function buildSampleModel(): WarehouseModel {
  const profiles: Record<string, RackProfile> = {};
  for (const [code, [vol, lv]] of Object.entries(PROFILE_DATA)) profiles[code] = makeSeedProfile(code, vol, lv);
  for (const [code, vol] of MOD_LEVELS) profiles[code] = makeSeedProfile(code, vol, 1);

  const factors: Record<string, UtilizationFactor> = {};
  for (const [category, uf, rf] of FACTOR_DATA)
    factors[category] = { category, utilizationFactor: uf, recommendedFactor: rf };

  const rackCategoryMap: Record<string, string> = {};
  for (const code of Object.keys(PROFILE_DATA)) rackCategoryMap[code] = code === "DR" ? "Dock Racks" : "Case Reserve";
  for (const [code] of MOD_LEVELS) rackCategoryMap[code] = "MODs";

  const DEPARTMENTS = [
    "Division 9", "Division 10", "Division 15", "Division 16", "Division 17",
    "Division 20", "Division 23", "Division 24", "Division 25", "Division 26",
  ];

  const bays: Bay[] = [];
  const occupancy: LocationOccupancy[] = [];
  const assignments: WarehouseModel["assignments"] = {};

  const locTypeFor = (zone: string): string =>
    zone === "Retail" ? "RTL" : zone === "Wholesale" ? "WHL" : "D";

  // Attach synthetic occupancy + a sample department to one bay, then record it.
  // Every bay's (aisle,bay,level,position) key is unique, so the occupancy join is
  // 1:1 (no over-attribution).
  const addBay = (b: {
    id: string; zone: Bay["zone"]; rackCode: string;
    aisle: string; bay: string; level: string; position: string;
    x?: number; y?: number; w?: number; h?: number;
  }) => {
    bays.push({
      id: b.id, zone: b.zone, rackCode: b.rackCode,
      aisle: b.aisle, bay: b.bay, level: b.level, position: b.position,
      source: "excel+cad", x: b.x, y: b.y, w: b.w, h: b.h,
    });
    // ~60% of bays assigned to a department (sample)
    if (rnd() < 0.6) assignments[b.id] = { bayId: b.id, department: DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)] };
    // synthetic occupancy: fill a fraction of capacity (product cube runs low)
    if (rnd() < 0.62) {
      const capIn = profiles[b.rackCode]?.bayVolumeIn ?? 0;
      const occFt = (capIn / 1728) * (0.05 + rnd() * 0.4);
      occupancy.push({
        key: locationKey(b.aisle, b.bay, b.level, b.position),
        aisle: b.aisle, bay: b.bay, level: b.level, position: b.position,
        locationType: locTypeFor(b.zone),
        locationClass: "Reserve Location",
        productDivision: assignments[b.id]?.department,
        occupiedCubicFt: occFt,
        units: Math.round(occFt * 4),
      });
    }
  };

  // Grid-backed zones (Retail / Wholesale / Dock): bays come straight from the
  // workbook layout, so each carries its REAL aisle number and grid position.
  const gridSeq: Record<string, number> = {};
  for (const gb of buildGridBays()) {
    const n = gridSeq[gb.zone] ?? 0;
    gridSeq[gb.zone] = n + 1;
    addBay({
      id: `${gb.zone[0]}-${gb.rackCode}-${n}`,
      zone: gb.zone, rackCode: gb.rackCode,
      aisle: gb.aisle, bay: gb.bay, level: "1", position: gb.position,
      x: gb.x, y: gb.y, w: gb.w, h: gb.h,
    });
  }

  // MODs have no workbook grid (module-level cubes); place them in their own row.
  MOD_LEVELS.forEach(([code], i) => {
    const g = modBayGeometry(i, MOD_LEVELS.length);
    addBay({
      id: `M-${code}-0`, zone: "MODs", rackCode: code,
      aisle: "MOD", bay: String(i), level: "1", position: "1",
      x: g.x, y: g.y, w: g.w, h: g.h,
    });
  });

  const inventory: InventorySnapshot = {
    label: "SAMPLE occupancy (synthetic)",
    asOf: "2026-07-17",
    building: "A",
    occupancy,
    unlocatedCubicFt: 0,
    unlocatedUnits: 0,
  };

  return {
    building: "A",
    profiles,
    factors,
    bays,
    assignments,
    rackCategoryMap,
    inventory,
    meta: {
      isSample: true,
      source: "sample-seed",
      createdAt: new Date().toISOString(),
      notes:
        "Capacity primitives are REAL workbook values; addresses and occupancy are synthetic sample data.",
    },
  };
}
