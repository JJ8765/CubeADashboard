/**
 * Dashboard.
 * =========
 * Headline KPIs, capacity/utilization charts (Recharts) and high/low-utilization
 * tables — all recomputed from the same model the map uses, so assignments made
 * on the map are reflected here live.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useWarehouse } from "@/store/useWarehouse";
import { useDerived } from "@/store/useDerived";
import {
  buildingSummary,
  rollupByDepartment,
  rollupByZone,
  type UtilRollup,
} from "@/domain/calc/utilization";
import { UTIL_COLOR, ZONE_COLOR, INK, categoricalColor } from "@/lib/colors";
import { ft3, pct } from "@/lib/format";

function Kpi({
  label,
  value,
  unit,
  sub,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-surf-1 p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mut">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums" style={{ color: tone }}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-mut">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[11px] text-ink-mut">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line/60 bg-surf-1 p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function tooltipFmt(value: number, name: string) {
  return [`${ft3(value)} ft³`, name];
}

export function Dashboard() {
  const model = useWarehouse((s) => s.model);
  const { metrics } = useDerived();

  const summary = useMemo(() => (model ? buildingSummary(model) : null), [model]);
  const byZone = useMemo(() => rollupByZone(metrics), [metrics]);
  const byDept = useMemo(() => rollupByDepartment(metrics), [metrics]);

  if (!model || !summary) return null;

  const zoneData = byZone.map((z) => ({
    name: z.key,
    capacity: Math.round(z.capacityFt),
    occupied: Math.round(z.occupiedFt),
  }));

  // department utilization (effective), assigned only, sorted
  const deptUtil = byDept
    .filter((d) => d.key !== "Unassigned")
    .map((d) => ({ name: d.key, util: d.utilizationEffective, capacity: d.capacityFt }))
    .sort((a, b) => b.util - a.util);

  const highest = [...deptUtil].slice(0, 6);
  const lowest = [...deptUtil].reverse().slice(0, 6);

  const assignedPct = summary.capacityFt > 0 ? summary.assignedCapacityFt / summary.capacityFt : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total capacity" value={ft3(summary.capacityFt)} unit="ft³" tone={INK.accent} />
        <Kpi label="Effective" value={ft3(summary.effectiveFt)} unit="ft³" tone={UTIL_COLOR.low} sub="capacity × factor" />
        <Kpi label="Occupied" value={ft3(summary.occupiedFt)} unit="ft³" tone={UTIL_COLOR.moderate} sub="actual used cube" />
        <Kpi
          label="Utilization"
          value={pct(summary.utilizationEffective)}
          sub={`${pct(summary.utilizationGross)} of gross`}
        />
        <Kpi label="Headroom" value={ft3(summary.headroomFt)} unit="ft³" sub="effective − occupied" />
        <Kpi
          label="Assigned"
          value={pct(assignedPct)}
          sub={`${summary.assignedBays.toLocaleString()} / ${summary.bays.toLocaleString()} bays`}
        />
      </section>

      {/* charts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Capacity vs. occupied by zone (ft³)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={zoneData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis dataKey="name" tick={{ fill: INK.ink2, fontSize: 11 }} stroke={INK.line} />
              <YAxis
                tick={{ fill: INK.mut, fontSize: 10 }}
                stroke={INK.line}
                tickFormatter={(v) => ft3(v as number)}
                width={44}
              />
              <Tooltip
                formatter={tooltipFmt as never}
                contentStyle={{ background: INK.surf2, border: `1px solid ${INK.line}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: INK.ink }}
                cursor={{ fill: "#ffffff08" }}
              />
              <Bar dataKey="capacity" name="Capacity" radius={[3, 3, 0, 0]}>
                {zoneData.map((d) => (
                  <Cell key={d.name} fill={ZONE_COLOR[d.name] ?? categoricalColor(d.name)} fillOpacity={0.45} />
                ))}
              </Bar>
              <Bar dataKey="occupied" name="Occupied" radius={[3, 3, 0, 0]}>
                {zoneData.map((d) => (
                  <Cell key={d.name} fill={ZONE_COLOR[d.name] ?? categoricalColor(d.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Utilization by department (effective)">
          {deptUtil.length === 0 ? (
            <EmptyChart note="No department assignments yet — assign racks on the map." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={deptUtil}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={(v) => pct(v as number)}
                  tick={{ fill: INK.mut, fontSize: 10 }}
                  stroke={INK.line}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: INK.ink2, fontSize: 10 }}
                  stroke={INK.line}
                  width={72}
                />
                <Tooltip
                  formatter={((v: number) => [pct(v), "Utilization"]) as never}
                  contentStyle={{ background: INK.surf2, border: `1px solid ${INK.line}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: INK.ink }}
                  cursor={{ fill: "#ffffff08" }}
                />
                <Bar dataKey="util" radius={[0, 3, 3, 0]}>
                  {deptUtil.map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.util >= 0.85 ? UTIL_COLOR.high : d.util >= 0.6 ? UTIL_COLOR.moderate : UTIL_COLOR.low}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* tables */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ZoneTable rows={byZone} />
        <UtilTable title="Highest utilization" rows={highest} accent={UTIL_COLOR.high} />
        <UtilTable title="Lowest utilization" rows={lowest} accent={UTIL_COLOR.low} />
      </section>
    </div>
  );
}

function EmptyChart({ note }: { note: string }) {
  return <div className="grid h-[240px] place-items-center text-center text-xs text-ink-mut">{note}</div>;
}

function ZoneTable({ rows }: { rows: UtilRollup[] }) {
  return (
    <div className="rounded-xl border border-line/60 bg-surf-1 p-4">
      <h3 className="mb-3 text-sm font-semibold">Capacity by zone</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[9px] uppercase tracking-wider text-ink-mut">
            <th className="pb-2">Zone</th>
            <th className="pb-2 text-right">Bays</th>
            <th className="pb-2 text-right">Capacity</th>
            <th className="pb-2 text-right">Util</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line/30">
              <td className="py-1.5 font-sans">
                <span className="mr-2 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: ZONE_COLOR[r.key] ?? categoricalColor(r.key) }} />
                {r.key}
              </td>
              <td className="py-1.5 text-right text-ink-2">{r.bays.toLocaleString()}</td>
              <td className="py-1.5 text-right">{ft3(r.capacityFt)}</td>
              <td className="py-1.5 text-right text-ink-2">{pct(r.utilizationEffective)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UtilTable({ title, rows, accent }: { title: string; rows: Array<{ name: string; util: number; capacity: number }>; accent: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-surf-1 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-mut">No assignments yet.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="font-mono tabular-nums">
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line/30 first:border-t-0">
                <td className="py-1.5 font-sans text-ink-2">{r.name}</td>
                <td className="py-1.5 text-right">{ft3(r.capacity)} ft³</td>
                <td className="py-1.5 text-right" style={{ color: accent }}>{pct(r.util)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
