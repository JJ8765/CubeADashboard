/**
 * Floor-plan geometry — driven by the real Excel grid.
 * ====================================================
 * Positioning comes from CubeA_MasterCopy.xlsx (the Retail / Wholesale / Dock
 * layout grids), scale/footprint from the CAD. The workbook grid is the source of
 * truth for WHERE each bay sits and WHICH aisle it belongs to:
 *
 *   - Aisles run VERTICALLY (north–south). Each grid COLUMN group is an aisle;
 *     Retail carries the sheet's real aisle numbers (PH1–PH8, then 62–99).
 *   - Racks run TOP-TO-BOTTOM: each grid ROW is a bay position down the aisle.
 *   - One grid cell = one bay. Per-code cell counts equal the workbook COUNTIF,
 *     so capacity still reconciles exactly (see tests/reconcile.test.ts).
 *
 * CAD-measured truths (drawing units = inches): column grid 52 ft × 50 ft; rack
 * floor ≈ 1847 ft × 625 ft. Coordinates here are FEET, origin at the building SW
 * corner, +x = east, +y = north.
 */

import type { Bay, ZoneId } from "../types";
import { FLOOR_GRID } from "./gridData";

export const FT_PER_CAD_UNIT = 1 / 12; // CAD drawing is in inches.

/** Building A rack floor, from the CAD extents (rounded to the column grid). */
export const BUILDING = { widthFt: 1850, depthFt: 625 };

/** Structural column grid, measured from BUILDING$0$BLDG_COLUMNS. */
export const COLUMN_GRID = { xPitchFt: 52, yPitchFt: 50 };

/** Nominal rack bay footprint from the workbook (96 in × 42 in). */
export const BAY = { widthFt: 8, depthFt: 3.5 };

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where each zone's grid is placed on the floor. Wholesale fills the west field,
 * Retail the east, Dock runs along the south (dock) edge, MODs sit high/centre —
 * the CAD arrangement. Each zone's grid is scaled to fill its rectangle while
 * keeping the real column-as-aisle / row-as-bay structure.
 */
const ZONE_RECT: Record<string, Rect> = {
  Wholesale: { x: 30, y: 95, w: 840, h: 470 },
  Retail: { x: 905, y: 95, w: 915, h: 470 },
  Dock: { x: 470, y: 20, w: 900, h: 46 },
  MODs: { x: 905, y: 578, w: 340, h: 34 },
};

export const ZONES: Record<Exclude<ZoneId, string> | string, { label: string; rect: Rect }> = {
  Retail: { label: "Retail", rect: ZONE_RECT.Retail },
  Wholesale: { label: "Wholesale", rect: ZONE_RECT.Wholesale },
  MODs: { label: "MODs", rect: ZONE_RECT.MODs },
  Dock: { label: "Dock Racks", rect: ZONE_RECT.Dock },
};

/** One bay's address + geometry, derived from a grid cell. */
export interface GridBay {
  zone: string;
  rackCode: string;
  aisle: string;
  /** bay slot down the aisle (0 = north end) */
  bay: string;
  /** rack face within the aisle (1 or 2) */
  position: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Build every bay for the grid-backed zones (Retail / Wholesale / Dock) from the
 * real workbook layout. Columns map to x (aisles, west→east), rows map to y with
 * the sheet's top row at the north end, so aisles read vertically and racks run
 * top-to-bottom exactly as drawn in the workbook.
 */
export function buildGridBays(): GridBay[] {
  const out: GridBay[] = [];
  for (const [zone, rect] of Object.entries(ZONE_RECT)) {
    const g = FLOOR_GRID[zone];
    if (!g) continue; // MODs has no grid; placed separately.
    const nCols = g.c1 - g.c0 + 1;
    const nRows = g.r1 - g.r0 + 1;
    const cw = rect.w / nCols;
    const ch = rect.h / nRows;

    // aisle → its sorted columns, so we can label rack faces as position 1 / 2.
    const aisleCols: Record<string, number[]> = {};
    for (const [c, label] of Object.entries(g.aisleByCol)) {
      (aisleCols[label] ??= []).push(Number(c));
    }
    for (const l of Object.keys(aisleCols)) aisleCols[l].sort((a, b) => a - b);

    for (const [code, r, c] of g.cells) {
      const aisle = g.aisleByCol[c] ?? "?";
      const cols = aisleCols[aisle] ?? [c];
      const position = String(cols.indexOf(c) + 1);
      const bay = String(r - g.r0); // down-aisle slot; 0 = north (sheet top row)
      out.push({
        zone,
        rackCode: code,
        aisle,
        bay,
        position,
        x: rect.x + (c - g.c0) * cw,
        y: rect.y + (g.r1 - r) * ch, // flip: sheet top row → north (high y)
        w: Math.max(1.5, cw * 0.86),
        h: Math.max(1.5, ch * 0.86),
      });
    }
  }
  return out;
}

/** Rectangle MODs bays are laid into (they have no workbook grid). */
export const MODS_RECT = ZONE_RECT.MODs;

/** Place the i-th MOD bay (of `count`) as a simple left→right row of blocks. */
export function modBayGeometry(i: number, count: number): Rect {
  const cw = MODS_RECT.w / Math.max(1, count);
  return { x: MODS_RECT.x + i * cw, y: MODS_RECT.y, w: cw * 0.86, h: MODS_RECT.h * 0.86 };
}

export function zoneRect(zone: string): Rect | undefined {
  return ZONE_RECT[zone];
}

export function hasGeometry(b: Bay): boolean {
  return b.x != null && b.y != null && b.w != null && b.h != null;
}
