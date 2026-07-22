/**
 * Valuation parser — "Formula DC Valuation by Building" .xlsb (optional overlay).
 * ============================================================================
 * These files are $-valuation PIVOT summaries (Sum of Ext Units / Cost / Price)
 * by category, building and location class — they carry NO cube/volume, so they
 * do not feed capacity math. They provide an optional dollar-value + time-trend
 * overlay for the executive dashboard.
 *
 * SheetJS reads .xlsb natively. The pivots are irregular, so this is a
 * best-effort extractor of labelled numeric summary rows from "Sheet1".
 */

import * as XLSX from "xlsx";

export interface ValuationRow {
  label: string;
  extUnits?: number;
  extCost?: number;
  extPrice?: number;
}

export interface ValuationSnapshot {
  label: string;
  asOf?: string;
  /** Labelled summary rows extracted from the pivot (category / building / class). */
  rows: ValuationRow[];
  grandTotal?: ValuationRow;
}

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return isFinite(n) && v !== null && v !== "" ? n : undefined;
};

/**
 * Extract labelled numeric rows from the valuation pivot. A "row" here is any
 * row whose first cells are [string label, number, number, number].
 */
export function parseValuation(data: ArrayBuffer, label = "Valuation"): ValuationSnapshot {
  const wb = XLSX.read(data, { type: "array", dense: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true });

  const rows: ValuationRow[] = [];
  let grandTotal: ValuationRow | undefined;

  for (const r of grid) {
    if (!r) continue;
    // Scan for a [label, n, n, n] shape at the start of the row.
    const lbl = typeof r[0] === "string" ? r[0].trim() : undefined;
    if (!lbl || lbl.toLowerCase() === "row labels") continue;
    const extUnits = num(r[1]);
    const extCost = num(r[2]);
    const extPrice = num(r[3]);
    if (extUnits === undefined && extCost === undefined && extPrice === undefined) continue;
    const row: ValuationRow = { label: lbl, extUnits, extCost, extPrice };
    if (lbl.toLowerCase() === "grand total") grandTotal = row;
    else rows.push(row);
  }

  return { label, rows, grandTotal };
}
