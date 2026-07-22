/**
 * Rack detail + assignment panel.
 * ===============================
 * Opens for the selected bay. Shows address, dimensions, levels and the full
 * capacity breakdown (total / effective / used / available / utilization), and
 * lets the user (re)assign department + storage type. Assignments write through
 * useWarehouse.setAssignment, which persists and triggers a model update — so
 * every metric on screen recomputes immediately.
 */

import { useWarehouse } from "@/store/useWarehouse";
import { useUi } from "@/store/useUi";
import { useDerived } from "@/store/useDerived";
import { utilizationBand } from "@/domain/calc/utilization";
import { UTIL_COLOR } from "@/lib/colors";
import { ft3, pct } from "@/lib/format";
import type { Assignment } from "@/domain/types";

const STANDARD_DEPARTMENTS = [
  "Division 9", "Division 10", "Division 15", "Division 16", "Division 17",
  "Division 20", "Division 23", "Division 24", "Division 25", "Division 26",
];

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[11px] text-ink-mut">{label}</span>
      <span className="font-mono text-sm tabular-nums" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}

export function RackPanel() {
  const selectedId = useUi((s) => s.selectedId);
  const select = useUi((s) => s.select);
  const model = useWarehouse((s) => s.model);
  const setAssignment = useWarehouse((s) => s.setAssignment);
  const { bayById, metricById, departments } = useDerived();

  if (!selectedId || !model) {
    return (
      <aside className="flex h-full w-[320px] shrink-0 flex-col items-center justify-center rounded-xl border border-line/60 bg-surf-1 p-6 text-center">
        <div className="mb-2 text-2xl">▦</div>
        <p className="text-sm text-ink-2">Select a rack on the map</p>
        <p className="mt-1 text-xs text-ink-mut">
          Hover to highlight, click to open its details and assignment here.
        </p>
      </aside>
    );
  }

  const bay = bayById.get(selectedId);
  const m = metricById.get(selectedId);
  if (!bay || !m) return null;

  const profile = model.profiles[bay.rackCode];
  const band = utilizationBand(m.utilizationGross, { assigned: m.occupiedFt > 0 });
  const utilColor = UTIL_COLOR[band];
  const current = model.assignments[bay.id];

  const update = (patch: Partial<Assignment>) => {
    const next: Assignment = { ...current, ...patch, bayId: bay.id };
    void setAssignment(bay.id, next);
  };

  const deptOptions = [...new Set([...STANDARD_DEPARTMENTS, ...departments])];
  const storageOptions = Object.keys(model.factors);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col rounded-xl border border-line/60 bg-surf-1">
      <header className="flex items-start justify-between border-b border-line/40 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: utilColor }}
              title={`utilization ${pct(m.utilizationGross)}`}
            />
            <h3 className="font-mono text-sm font-semibold">{bay.id}</h3>
          </div>
          <p className="mt-0.5 text-xs text-ink-mut">
            {bay.zone} · rack <span className="font-mono">{bay.rackCode}</span>
          </p>
        </div>
        <button
          onClick={() => select(null)}
          className="rounded-md px-2 py-1 text-ink-mut hover:bg-surf-2 hover:text-ink"
          title="Close"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {/* utilization bar */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-ink-mut">
            <span>Utilization (used ÷ capacity)</span>
            <span className="font-mono" style={{ color: utilColor }}>
              {pct(m.utilizationGross)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surf-3">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, m.utilizationGross * 100)}%`, background: utilColor }}
            />
          </div>
        </div>

        <Section title="Location">
          <Row label="Aisle" value={bay.aisle ?? "—"} />
          <Row label="Bay" value={bay.bay ?? "—"} />
          <Row label="Level" value={bay.level ?? "—"} />
          <Row label="Position" value={bay.position ?? "—"} />
          <Row label="Map position" value={`${bay.x?.toFixed(0)}, ${bay.y?.toFixed(0)} ft`} />
          <Row label="Footprint" value={`${bay.w} × ${bay.h} ft`} />
        </Section>

        <Section title="Rack">
          <Row label="Type" value={bay.rackCode} />
          <Row label="Levels" value={profile?.levelCount ?? "—"} />
          <Row label="Bay volume" value={`${ft3(m.capacityFt)} ft³`} />
          <Row label="Source" value={bay.source} />
        </Section>

        <Section title="Capacity">
          <Row label="Total capacity" value={`${ft3(m.capacityFt)} ft³`} tone="#34e4ea" />
          <Row label="Effective (factor)" value={`${ft3(m.effectiveFt)} ft³`} tone="#27c37e" />
          <Row label="Used (occupied)" value={`${ft3(m.occupiedFt)} ft³`} tone="#f4b740" />
          <Row
            label="Available (headroom)"
            value={`${ft3(m.headroomFt)} ft³`}
            tone={m.headroomFt < 0 ? "#f2624a" : undefined}
          />
          <Row label="Design factor" value={pct(m.factor)} />
        </Section>

        <Section title="Assignment">
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] text-ink-mut">Department</span>
            <select
              value={current?.department ?? ""}
              onChange={(e) => update({ department: e.target.value || undefined })}
              className="w-full rounded-md border border-line/60 bg-surf-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
            >
              <option value="">Unassigned</option>
              {deptOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] text-ink-mut">Storage type (utilization factor)</span>
            <select
              value={current?.storageType ?? ""}
              onChange={(e) => update({ storageType: e.target.value || undefined })}
              className="w-full rounded-md border border-line/60 bg-surf-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
            >
              <option value="">Default ({model.rackCategoryMap[bay.rackCode] ?? "—"})</option>
              {storageOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-mut">Notes</span>
            <textarea
              value={current?.notes ?? ""}
              onChange={(e) => update({ notes: e.target.value || undefined })}
              rows={2}
              placeholder="Constraints, comments…"
              className="w-full resize-none rounded-md border border-line/60 bg-surf-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
            />
          </label>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-mut">{title}</h4>
      <div className="rounded-lg border border-line/40 bg-surf-2/40 px-3 py-1.5">{children}</div>
    </section>
  );
}
