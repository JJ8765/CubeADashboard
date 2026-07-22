/**
 * Foundation screen.
 * ==================
 * The non-visual foundation milestone: this page runs the calc engine live in the
 * browser against the loaded model and shows the workbook reconciliation, proving
 * the data layer end-to-end. The interactive map + full dashboard mount here next,
 * once the CAD SVG geometry lands.
 */

import { useEffect, useMemo } from "react";
import { useWarehouse } from "@/store/useWarehouse";
import { buildingCapacity } from "@/domain/calc/capacity";
import { buildingSummary } from "@/domain/calc/utilization";
import { totalOccupiedFt } from "@/domain/calc/occupancy";
import type { WarehouseModel, ZoneId } from "@/domain/types";
import { ft3, pct } from "@/lib/format";

// Reference totals from CubeA_MasterCopy.xlsx (Summary sheet) for a live check.
const EXPECTED: Array<{ zone: ZoneId; label: string; ft: number }> = [
  { zone: "Retail", label: "Retail", ft: 1557569 },
  { zone: "Wholesale", label: "Wholesale", ft: 1380934 },
  { zone: "MODs", label: "MODs", ft: 134359.96 },
  { zone: "Dock", label: "Dock Racks", ft: 36521.33 },
];

function zoneFt(model: WarehouseModel, zone: ZoneId): number {
  return buildingCapacity({ ...model, bays: model.bays.filter((b) => b.zone === zone) }).totalFt;
}

function Kpi({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-surf-1 p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mut">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold" style={{ color: tone }}>
        {value} {unit && <span className="text-sm font-normal text-ink-mut">{unit}</span>}
      </div>
    </div>
  );
}

export default function App() {
  const { model, loading, init, resetToOriginal } = useWarehouse();
  useEffect(() => {
    void init();
  }, [init]);

  const summary = useMemo(() => (model ? buildingSummary(model) : null), [model]);
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

  if (loading || !model || !summary) {
    return <div className="grid h-full place-items-center text-ink-mut">Loading model…</div>;
  }

  const occupied = model.inventory ? totalOccupiedFt(model.inventory) : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-accent-deep" />
            <h1 className="text-xl font-semibold">CubeA — Capacity Foundation</h1>
          </div>
          <p className="mt-1 text-sm text-ink-2">
            Data + calculation core · building {model.building} ·{" "}
            <span className="font-mono">{model.bays.length.toLocaleString()}</span> bays
          </p>
        </div>
        <div className="flex items-center gap-3">
          {model.meta.isSample && (
            <span className="rounded-md bg-util-mod px-2 py-1 font-mono text-[10px] font-bold text-plane">
              SAMPLE DATA
            </span>
          )}
          <button
            onClick={() => void resetToOriginal()}
            className="rounded-lg border border-line/60 bg-surf-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink"
          >
            Reset to original
          </button>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Total capacity" value={ft3(summary.capacityFt)} unit="ft³" tone="#34e4ea" />
        <Kpi label="Effective (factor)" value={ft3(summary.effectiveFt)} unit="ft³" tone="#27c37e" />
        <Kpi label="Occupied (actual)" value={ft3(occupied)} unit="ft³" tone="#f4b740" />
        <Kpi label="Utilization" value={pct(summary.utilizationGross)} unit="gross" />
        <Kpi label="Headroom" value={ft3(summary.headroomFt)} unit="ft³" />
      </section>

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
                <td className="py-2 text-right" style={{ color: r.ok ? "#27c37e" : "#f2624a" }}>
                  {r.ok ? "✓ match" : "✗ off"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-mut">
          Capacity primitives are the real workbook values; the engine recomputes every total from them.
          Next milestone: the interactive SVG map mounts on top of this same model.
        </p>
      </section>
    </div>
  );
}
