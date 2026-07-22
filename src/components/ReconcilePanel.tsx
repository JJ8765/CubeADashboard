/**
 * Workbook reconciliation — the accuracy proof.
 * ============================================
 * Runs the calc engine against the loaded model and compares each zone total to
 * the reference value from CubeA_MasterCopy.xlsx (Summary sheet). Kept visible so
 * the numbers stay auditable against the original workbook at any time.
 */

import { useMemo } from "react";
import { useWarehouse } from "@/store/useWarehouse";
import { buildingCapacity } from "@/domain/calc/capacity";
import type { WarehouseModel, ZoneId } from "@/domain/types";

const EXPECTED: Array<{ zone: ZoneId; label: string; ft: number; cell: string }> = [
  { zone: "Retail", label: "Retail", ft: 1557569, cell: "Retail!F18" },
  { zone: "Wholesale", label: "Wholesale", ft: 1380934, cell: "Wholesale!I15" },
  { zone: "MODs", label: "MODs", ft: 134359.96, cell: "Mods Summary!D14" },
  { zone: "Dock", label: "Dock Racks", ft: 36521.33, cell: "Dock Racks!K6" },
];

function zoneFt(model: WarehouseModel, zone: ZoneId): number {
  return buildingCapacity({ ...model, bays: model.bays.filter((b) => b.zone === zone) }).totalFt;
}

export function ReconcilePanel() {
  const model = useWarehouse((s) => s.model);
  const rows = useMemo(
    () =>
      model
        ? EXPECTED.map((e) => {
            const got = zoneFt(model, e.zone);
            return { ...e, got, ok: Math.abs(got - e.ft) < 2 };
          })
        : [],
    [model],
  );
  if (!model) return null;

  return (
    <section className="rounded-xl border border-line/60 bg-surf-1 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Workbook reconciliation</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mut">
          engine vs. Summary sheet
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-ink-mut">
            <th className="pb-2">Zone</th>
            <th className="pb-2 text-right">Engine ft³</th>
            <th className="pb-2 text-right">Workbook ft³</th>
            <th className="pb-2 text-right">Δ</th>
            <th className="pb-2 text-right">Source</th>
            <th className="pb-2 text-right">Check</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {rows.map((r) => (
            <tr key={r.zone} className="border-t border-line/30">
              <td className="py-2 font-sans">{r.label}</td>
              <td className="py-2 text-right">{r.got.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              <td className="py-2 text-right text-ink-2">{r.ft.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              <td className="py-2 text-right text-ink-mut">{(r.got - r.ft).toFixed(1)}</td>
              <td className="py-2 text-right text-[11px] text-ink-mut">{r.cell}</td>
              <td className="py-2 text-right" style={{ color: r.ok ? "#27c37e" : "#f2624a" }}>
                {r.ok ? "✓ match" : "✗ off"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-mut">
        Capacity primitives are the real workbook values; the engine recomputes every total from them.
        The interactive map and dashboard run on this exact model.
      </p>
    </section>
  );
}
