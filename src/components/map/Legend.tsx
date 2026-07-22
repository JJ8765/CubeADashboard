/**
 * Map legend — explains the active coloring mode.
 */

import { UTIL_COLOR, UTIL_LABEL, ZONE_COLOR } from "@/lib/colors";
import type { UtilBand } from "@/domain/calc/utilization";
import type { ColorBy } from "@/store/useUi";
import { useDerived } from "@/store/useDerived";
import { categoricalColor } from "@/lib/colors";

export function Legend({ colorBy }: { colorBy: ColorBy }) {
  const { zones, departments } = useDerived();

  let items: Array<{ color: string; label: string }> = [];
  if (colorBy === "utilization") {
    items = (["low", "moderate", "high", "none"] as UtilBand[]).map((b) => ({
      color: UTIL_COLOR[b],
      label: UTIL_LABEL[b],
    }));
  } else if (colorBy === "zone") {
    items = zones.map((z) => ({ color: ZONE_COLOR[z] ?? categoricalColor(z), label: z }));
  } else if (colorBy === "department") {
    items = departments.slice(0, 10).map((d) => ({ color: categoricalColor(d), label: d }));
    items.push({ color: UTIL_COLOR.none, label: "Unassigned" });
  } else {
    // rackType legend would be long; show a hint instead
    items = [{ color: "#7c9cff", label: "One color per rack type" }];
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line/50 bg-surf-1/85 p-2.5 backdrop-blur">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-mut">
        {colorBy}
      </div>
      <ul className="flex max-w-[220px] flex-col gap-1">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-[11px] text-ink-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: it.color }} />
            <span className="truncate">{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
