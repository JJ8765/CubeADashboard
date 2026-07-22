/**
 * Map control rail — search, color-by, and filters.
 * =================================================
 * Drives useUi; the map reads the same state to highlight/dim bays and recolor.
 */

import { useDerived, useMatchedIds } from "@/store/useDerived";
import { useUi, type ColorBy } from "@/store/useUi";
import { pct } from "@/lib/format";

const COLOR_MODES: Array<{ id: ColorBy; label: string }> = [
  { id: "utilization", label: "Utilization" },
  { id: "zone", label: "Zone" },
  { id: "department", label: "Dept" },
  { id: "rackType", label: "Rack" },
];

export function MapControls() {
  const derived = useDerived();
  const matched = useMatchedIds(derived);
  const { zones, rackCodes, bayById } = derived;

  const colorBy = useUi((s) => s.colorBy);
  const setColorBy = useUi((s) => s.setColorBy);
  const search = useUi((s) => s.search);
  const setSearch = useUi((s) => s.setSearch);
  const filters = useUi((s) => s.filters);
  const setFilter = useUi((s) => s.setFilter);
  const resetFilters = useUi((s) => s.resetFilters);

  const total = bayById.size;
  const matchCount = matched ? matched.size : total;

  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-4 rounded-xl border border-line/60 bg-surf-1 p-4">
      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-mut">
          Search
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="id, aisle, code, dept…"
          className="w-full rounded-md border border-line/60 bg-surf-2 px-2 py-1.5 text-sm text-ink outline-none placeholder:text-ink-mut focus:border-accent/60"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-mut">
          Color by
        </label>
        <div className="grid grid-cols-2 gap-1">
          {COLOR_MODES.map((c) => (
            <button
              key={c.id}
              onClick={() => setColorBy(c.id)}
              className={`rounded-md border px-2 py-1 text-xs transition ${
                colorBy === c.id
                  ? "border-accent/60 bg-accent/15 text-ink"
                  : "border-line/60 bg-surf-2 text-ink-2 hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      <Select
        label="Zone"
        value={filters.zone}
        onChange={(v) => setFilter("zone", v)}
        options={["all", ...zones]}
      />

      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-mut">
          Assignment
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(["all", "assigned", "unassigned"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setFilter("assignment", a)}
              className={`rounded-md border px-1 py-1 text-[11px] capitalize transition ${
                filters.assignment === a
                  ? "border-accent/60 bg-accent/15 text-ink"
                  : "border-line/60 bg-surf-2 text-ink-2 hover:text-ink"
              }`}
            >
              {a === "unassigned" ? "unassg" : a}
            </button>
          ))}
        </div>
      </div>

      <Select
        label="Rack type"
        value={filters.rackCode}
        onChange={(v) => setFilter("rackCode", v)}
        options={["all", ...rackCodes]}
      />

      <div>
        <label className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ink-mut">
          <span>Utilization</span>
          <span className="text-ink-2">
            {pct(filters.utilMin)}–{pct(filters.utilMax)}
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.utilMin}
          onChange={(e) => setFilter("utilMin", Math.min(Number(e.target.value), filters.utilMax))}
          className="w-full accent-accent"
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.utilMax}
          onChange={(e) => setFilter("utilMax", Math.max(Number(e.target.value), filters.utilMin))}
          className="w-full accent-accent"
        />
      </div>

      <Divider />

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink-2">
          {matchCount.toLocaleString()}
          <span className="text-ink-mut"> / {total.toLocaleString()}</span>
        </span>
        <button
          onClick={resetFilters}
          className="rounded-md border border-line/60 bg-surf-2 px-2 py-1 text-[11px] text-ink-2 hover:text-ink"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-mut">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line/60 bg-surf-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "All" : o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-line/40" />;
}
