/**
 * CubeA domain data model
 * =========================
 * Central type definitions for the warehouse capacity + utilization model.
 *
 * Design intent (see PROJECT_NOTES for the analysis this is derived from):
 *  - CubeA master workbook  -> DATA MASTER: which racks exist, their profiles &
 *    CAPACITY (cubic volume).
 *  - CAD SVG                -> GEOMETRY: true x/y positions of each bay on the map.
 *  - Inventory detail export -> OCCUPANCY: actual used cube by physical location.
 *  - Valuation (.xlsb)       -> OPTIONAL OVERLAY: $ value + time trend.
 *
 * Everything here is UI-agnostic. Calculations live in ./calc and never import
 * React. The repository interface (./repository) keeps storage swappable so the
 * first version can run on localStorage and later move to a real database.
 */

/** Cubic inches per cubic foot — the workbook's unit conversion constant. */
export const CUBIC_IN_PER_FT = 1728;

// ---------------------------------------------------------------------------
// Rack profiles (from the workbook "Master Table", Location Details!S:X)
// ---------------------------------------------------------------------------

/** One shelf level within a rack profile. `level` may be a number or "RF"/"D". */
export interface RackLevel {
  level: string; // e.g. "1", "2", "RF"
  heightIn: number;
  widthIn: number;
  depthIn: number;
  /** volumeIn = height * width * depth  (Excel: X = U*V*W) */
  volumeIn: number;
}

/**
 * A rack *type* / bay profile such as "A1", "R4", "DR".
 * Bay volume = sum of the level volumes (Excel: SUM of Location Details!X range).
 */
export interface RackProfile {
  code: string;
  levels: RackLevel[];
  /** bayVolumeIn = Σ level.volumeIn */
  bayVolumeIn: number;
  levelCount: number;
}

// ---------------------------------------------------------------------------
// Utilization factors (from the "Utilization Rates" sheet)
// ---------------------------------------------------------------------------

/**
 * A storage category with its design utilization factors. These express the
 * fraction of gross rack cube that is realistically usable — NOT actual fill.
 * Example rows: Pallet Reserve 0.80, Pallet Active 0.65, Dock Racks 0.80.
 */
export interface UtilizationFactor {
  category: string;
  utilizationFactor: number; // Utilization Rates col C
  recommendedFactor: number; // Utilization Rates col D
}

// ---------------------------------------------------------------------------
// Layout (the cell grid on Retail / Wholesale / Dock Racks sheets, and later SVG)
// ---------------------------------------------------------------------------

/** Which sheet / area of the building a location belongs to. */
export type ZoneId = "Retail" | "Wholesale" | "MODs" | "Dock" | (string & {});

/**
 * One physical bay/location. In the workbook this is a single grid cell holding
 * a rack-type code; in the app it becomes a clickable object on the map.
 *
 * `rackCode` is the DATA-master key (drives capacity). `x/y/w/h` are filled from
 * the CAD SVG geometry when available; until then they are undefined and the
 * bay is placed schematically.
 */
export interface Bay {
  /** Stable id, unique across the building. */
  id: string;
  zone: ZoneId;
  rackCode: string; // -> RackProfile.code
  /** Physical address (from CAD + inventory): aisle / bay / level / position. */
  aisle?: string;
  bay?: string;
  level?: string;
  position?: string;
  /** Geometry (CAD SVG). Millimetre/inch/px units are normalised by the loader. */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /** Source flags used by the reconciliation report. */
  source: BaySource;
}

export type BaySource =
  | "excel" // exists in workbook grid
  | "excel+cad" // in both (geometry available)
  | "cad-only"; // drawn in CAD but absent from workbook -> non-capacity feature

// ---------------------------------------------------------------------------
// Assignments (the added layer: department / storage-type tagging)
// ---------------------------------------------------------------------------

export interface Assignment {
  bayId: string;
  department?: string; // e.g. "Division 17"
  category?: string; // product category
  storageType?: string; // -> UtilizationFactor.category
  notes?: string;
}

// ---------------------------------------------------------------------------
// Inventory occupancy (from the Inventory Detail export)
// ---------------------------------------------------------------------------

/**
 * Occupied cube aggregated to a physical location key. Built from the inventory
 * detail file: Σ (Quantity × unit Volume(ft³)) per (aisle, bay, level, position).
 */
export interface LocationOccupancy {
  /** Composite address key: `${aisle}|${bay}|${level}|${position}`. */
  key: string;
  aisle?: string;
  bay?: string;
  level?: string;
  position?: string;
  locationType?: string; // RTL / WHL / D / PLT ...
  locationClass?: string; // Reserve / Pack & Hold / Active ...
  productDivision?: string;
  occupiedCubicFt: number;
  units: number;
  /** Optional $ value (present if the valuation overlay is loaded). */
  extendedCost?: number;
  extendedPrice?: number;
}

export interface InventorySnapshot {
  /** Label the user sees (e.g. file name + report date). */
  label: string;
  /** ISO date of the snapshot if parseable from the file. */
  asOf?: string;
  building: string; // "A" for CubeA
  occupancy: LocationOccupancy[];
  /** Rows that could not be mapped to a rack location (receiving, non-located). */
  unlocatedCubicFt: number;
  unlocatedUnits: number;
}

// ---------------------------------------------------------------------------
// The assembled model consumed by the calc engine and UI
// ---------------------------------------------------------------------------

/**
 * Everything needed to compute capacity + utilization. Assembled by the parsers
 * (real upload) or the sample seed. Kept flat and serialisable for localStorage.
 */
export interface WarehouseModel {
  building: string;
  profiles: Record<string, RackProfile>;
  factors: Record<string, UtilizationFactor>;
  bays: Bay[];
  assignments: Record<string, Assignment>; // keyed by bayId
  /** Default storage category per rack code (data-mapping page can override). */
  rackCategoryMap: Record<string, string>;
  inventory?: InventorySnapshot;
  /** Provenance / marker so the UI can flag sample vs. real data. */
  meta: ModelMeta;
}

export interface ModelMeta {
  isSample: boolean;
  source: string; // e.g. "CubeA_MasterCopy.xlsx" or "sample-seed"
  createdAt: string;
  notes?: string;
}
