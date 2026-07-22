/**
 * Floor-plan geometry — CAD/Excel-derived, rebuilt natively.
 * =========================================================
 * This module is our OWN geometric model of Building A. It is not the CAD file
 * itself: the AutoCAD drawing (Building_A_7726_Editing.dwg) was measured for the
 * true dimensions below, then the layout was rebuilt parametrically so the app
 * ships clean vector geometry instead of a 30 MB drawing export.
 *
 * Division of truth (per the source data):
 *   - CAD holds TRUE GEOMETRY. Measured from the drawing (units = inches):
 *       • Structural column grid: 52 ft (624 in) on centre in X, 50 ft (600 in) in Y.
 *       • Rack floor extents: ~1847 ft (E–W) × ~625 ft (N–S).
 *     These fix the real-world scale and footprint used here.
 *   - CubeA_MasterCopy.xlsx holds BAY DIMENSIONS + RELATIVE LAYOUT. The Retail /
 *     Wholesale sheets are the physical grid of rack-type codes (bays in double
 *     rows split by aisles); the per-code counts drive how many bays we place.
 *
 * Everything is expressed in FEET, origin at the building's south-west corner,
 * +x = east (length), +y = north (depth). One clickable Bay -> one rectangle.
 */

import type { Bay, ZoneId } from "../types";

/** All measurements below are in FEET unless a name says otherwise. */
export const FT_PER_CAD_UNIT = 1 / 12; // CAD drawing is in inches.

/** Building A rack floor, measured from the CAD extents (rounded to the column grid). */
export const BUILDING = {
  /** East–west length. CAD: 36 column bays × 52 ft ≈ 1872 ft; rack extents ≈ 1847 ft. */
  widthFt: 1850,
  /** North–south depth. CAD rack extents ≈ 625 ft. */
  depthFt: 625,
};

/** Structural column grid, measured from BUILDING$0$BLDG_COLUMNS balloons. */
export const COLUMN_GRID = { xPitchFt: 52, yPitchFt: 50 };

/**
 * Rack bay footprint. From the workbook the nominal bay is 96 in × 42 in.
 *   - `widthFt`  = 8 ft   → run direction (bays sit shoulder-to-shoulder along a row)
 *   - `depthFt`  = 3.5 ft → rack depth (one row)
 */
export const BAY = { widthFt: 8, depthFt: 3.5 };

/**
 * Aisle module: two rack rows placed back-to-back (7 ft) plus a pick aisle
 * (~11 ft), i.e. a repeating 18 ft pitch in the depth direction — consistent
 * with the 52 ft column bay measured in the CAD.
 */
export const ROW_PITCH_FT = 18;

/**
 * Zone regions on the floor, derived from the CAD arrangement of the rack field
 * (MODs sit high/centre-left near the MODULE 6/7/8 tags; Dock racks run along the
 * shipping/south edge; Retail occupies the larger west field, Wholesale the east).
 * Rectangles are [x, y, width, depth] in feet.
 */
export const ZONES: Record<Exclude<ZoneId, string> | string, {
  label: string;
  rect: { x: number; y: number; w: number; h: number };
}> = {
  Retail: { label: "Retail", rect: { x: 30, y: 110, w: 1010, h: 470 } },
  Wholesale: { label: "Wholesale", rect: { x: 1075, y: 110, w: 745, h: 470 } },
  MODs: { label: "MODs", rect: { x: 30, y: 588, w: 700, h: 30 } },
  Dock: { label: "Dock Racks", rect: { x: 300, y: 18, w: 1220, h: 70 } },
};

/**
 * Sequential bay allocator for one zone region. Lays bays left→right in a row,
 * then steps north by ROW_PITCH_FT to the next row — an authentic aisle-and-row
 * fill. Consecutive rack codes therefore block together, mirroring how the
 * workbook grid groups a rack type before the next begins.
 */
export class ZoneAllocator {
  private x: number;
  private y: number;
  private readonly x0: number;
  private readonly xMax: number;
  private readonly yMax: number;

  constructor(private readonly rect: { x: number; y: number; w: number; h: number }) {
    this.x0 = rect.x;
    this.x = rect.x;
    this.y = rect.y;
    this.xMax = rect.x + rect.w;
    this.yMax = rect.y + rect.h;
  }

  /** Hand out the next bay rectangle (feet). Wraps to the next row as needed. */
  next(): { x: number; y: number; w: number; h: number } {
    if (this.x + BAY.widthFt > this.xMax) {
      this.x = this.x0;
      this.y += ROW_PITCH_FT;
    }
    // If we overflow the region depth, wrap back to the bottom (keeps sample
    // geometry bounded; real uploads carry exact CAD coordinates per bay).
    if (this.y + BAY.depthFt > this.yMax) {
      this.y = this.rect.y;
    }
    const bay = { x: this.x, y: this.y, w: BAY.widthFt, h: BAY.depthFt };
    this.x += BAY.widthFt;
    return bay;
  }
}

/** Build one allocator per zone, ready to hand out bay geometry. */
export function makeAllocators(): Record<string, ZoneAllocator> {
  const out: Record<string, ZoneAllocator> = {};
  for (const [zone, def] of Object.entries(ZONES)) out[zone] = new ZoneAllocator(def.rect);
  return out;
}

/** Convenience: the geometry of a zone's bounding rectangle (for the map frame). */
export function zoneRect(zone: string) {
  return ZONES[zone]?.rect;
}

/** True if a bay carries placed geometry. */
export function hasGeometry(b: Bay): boolean {
  return b.x != null && b.y != null && b.w != null && b.h != null;
}
