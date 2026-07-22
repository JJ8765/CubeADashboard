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
import { makeAllocators } from "../layout/floorplan";
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

// --- REAL per-code bay counts (COUNTIF over each grid) -----------------------
const RETAIL_COUNTS: Record<string, number> = {
  A1: 1513, A4: 150, AT: 16, A4S: 6, R1: 72, R4: 8, G1: 24, G4: 6,
  B1: 72, B4: 6, Y1: 18, Y3: 78, L1: 16, L4: 2, E: 22, E2: 1,
};
const WHOLESALE_COUNTS: Record<string, number> = {
  A1: 1217, A4: 68, A4W: 19, R1: 56, R4: 4, X1: 154, X4: 11, Z1: 287, Z4: 13, E: 47, E2: 4,
};
const DOCK_COUNTS: Record<string, number> = { DR: 43 };

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

  // CAD/Excel-derived floor geometry: one allocator per zone hands out the
  // real-world x/y/w/h rectangle for each bay as it is emitted.
  const allocators = makeAllocators();

  const emit = (zone: Bay["zone"], code: string, count: number, aislePrefix: string) => {
    for (let i = 0; i < count; i++) {
      const aisle = `${aislePrefix}${String(Math.floor(i / 14) + 1).padStart(3, "0")}`;
      const level = "ABCDEF"[i % 6];
      const position = String((i % 2) + 1);
      const id = `${zone[0]}-${code}-${i}`;
      const g = allocators[zone]?.next();
      bays.push({
        id, zone, rackCode: code, aisle, bay: String(i), level, position,
        source: "excel+cad",
        x: g?.x, y: g?.y, w: g?.w, h: g?.h,
      });

      // ~60% of bays assigned to a department (sample)
      if (rnd() < 0.6) assignments[id] = { bayId: id, department: DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)] };

      // synthetic occupancy: fill a fraction of capacity (product cube runs low)
      if (rnd() < 0.62) {
        const capIn = profiles[code].bayVolumeIn;
        const occFt = (capIn / 1728) * (0.05 + rnd() * 0.4);
        occupancy.push({
          key: locationKey(aisle, String(i), level, position),
          aisle, bay: String(i), level, position,
          locationType: zone === "Retail" ? "RTL" : zone === "Wholesale" ? "WHL" : "D",
          locationClass: "Reserve Location",
          productDivision: assignments[id]?.department,
          occupiedCubicFt: occFt,
          units: Math.round(occFt * 4),
        });
      }
    }
  };

  for (const [code, n] of Object.entries(RETAIL_COUNTS)) emit("Retail", code, n, "6");
  for (const [code, n] of Object.entries(WHOLESALE_COUNTS)) emit("Wholesale", code, n, "0");
  for (const [code, n] of Object.entries(DOCK_COUNTS)) emit("Dock", code, n, "D");
  for (const [code] of MOD_LEVELS) emit("MODs", code, 1, "M");

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
