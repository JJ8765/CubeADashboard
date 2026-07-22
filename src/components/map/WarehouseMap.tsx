/**
 * Interactive warehouse map (SVG).
 * ===============================
 * Renders every bay from the CAD-derived geometry as a rectangle in true feet,
 * colored by the active mode, with hover-glow, click-to-select, zoom/pan, zone
 * frames and search/filter highlight. The bay layer is memoized and the
 * hover/selection are drawn as a thin overlay so pointer moves never re-render
 * thousands of rects.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BUILDING, ZONES } from "@/domain/layout/floorplan";
import { utilizationBand, type BayMetrics } from "@/domain/calc/utilization";
import { UTIL_COLOR, ZONE_COLOR, categoricalColor, INK } from "@/lib/colors";
import { useUi, type ColorBy } from "@/store/useUi";
import { useDerived, useMatchedIds } from "@/store/useDerived";
import type { Bay } from "@/domain/types";
import { Legend } from "./Legend";

const PAD = 40; // feet of margin around the footprint in the viewBox
const VB_W = BUILDING.widthFt + PAD * 2;
const VB_H = BUILDING.depthFt + PAD * 2;

/** World rect for a bay (SVG y-down, so north maps to a smaller y). */
interface Placed {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function place(b: Bay): Placed | null {
  if (b.x == null || b.y == null || b.w == null || b.h == null) return null;
  return { id: b.id, x: b.x + PAD, y: BUILDING.depthFt - b.y - b.h + PAD, w: b.w, h: b.h };
}

function fillFor(colorBy: ColorBy, bay: Bay, m: BayMetrics | undefined): string {
  switch (colorBy) {
    case "zone":
      return ZONE_COLOR[bay.zone] ?? categoricalColor(bay.zone);
    case "department":
      return m?.department ? categoricalColor(m.department) : UTIL_COLOR.none;
    case "rackType":
      return categoricalColor(bay.rackCode);
    case "utilization":
    default: {
      if (!m) return UTIL_COLOR.none;
      const band = utilizationBand(m.utilizationGross, { assigned: m.occupiedFt > 0 });
      return UTIL_COLOR[band];
    }
  }
}

/** The (expensive) bay layer — re-renders only when its inputs change. */
const BayLayer = memo(function BayLayer({
  placed,
  fills,
  dimmed,
}: {
  placed: Placed[];
  fills: Map<string, string>;
  dimmed: Set<string> | null;
}) {
  return (
    <g>
      {placed.map((p) => {
        const isDim = dimmed?.has(p.id) === false;
        return (
          <rect
            key={p.id}
            data-id={p.id}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            fill={fills.get(p.id) ?? UTIL_COLOR.none}
            opacity={isDim ? 0.12 : 1}
            stroke="none"
          />
        );
      })}
    </g>
  );
});

export function WarehouseMap() {
  const derived = useDerived();
  const matched = useMatchedIds(derived);
  const colorBy = useUi((s) => s.colorBy);
  const selectedId = useUi((s) => s.selectedId);
  const hoverId = useUi((s) => s.hoverId);
  const select = useUi((s) => s.select);
  const hover = useUi((s) => s.hover);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const moved = useRef(false);

  const placed = useMemo(
    () => derived.model?.bays.map(place).filter((p): p is Placed => p !== null) ?? [],
    [derived.model],
  );
  const placedById = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);

  const fills = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of derived.model?.bays ?? []) {
      map.set(b.id, fillFor(colorBy, b, derived.metricById.get(b.id)));
    }
    return map;
  }, [derived, colorBy]);

  // --- screen → viewBox coordinate helper -----------------------------------
  const toVB = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return { x: inv.a * clientX + inv.c * clientY + inv.e, y: inv.b * clientX + inv.d * clientY + inv.f };
  }, []);

  // Wheel-zoom to cursor. Attached as a NON-passive native listener so
  // preventDefault actually stops the page from scrolling under the map (React's
  // synthetic onWheel is passive and would warn + fail to preventDefault).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const p = toVB(e.clientX, e.clientY);
      setView((v) => {
        const k2 = Math.min(40, Math.max(0.6, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        const lx = (p.x - v.tx) / v.k;
        const ly = (p.y - v.ty) / v.k;
        return { k: k2, tx: p.x - lx * k2, ty: p.y - ly * k2 };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [toVB]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const p = toVB(e.clientX, e.clientY);
      pan.current = { x: p.x, y: p.y, tx: view.tx, ty: view.ty };
      moved.current = false;
    },
    [toVB, view.tx, view.ty],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pan.current) {
        const p = toVB(e.clientX, e.clientY);
        const dx = p.x - pan.current.x;
        const dy = p.y - pan.current.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved.current = true;
        setView((v) => ({ ...v, tx: pan.current!.tx + dx, ty: pan.current!.ty + dy }));
        return;
      }
      const id = (e.target as SVGElement).dataset?.id ?? null;
      if (id !== hoverId) hover(id);
    },
    [toVB, hover, hoverId],
  );

  const onPointerUp = useCallback(() => {
    pan.current = null;
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (moved.current) return; // was a drag, not a click
      const id = (e.target as SVGElement).dataset?.id ?? null;
      select(id);
    },
    [select],
  );

  const zoomBtn = (factor: number) =>
    setView((v) => {
      const k2 = Math.min(40, Math.max(0.6, v.k * factor));
      const cx = VB_W / 2;
      const cy = VB_H / 2;
      const lx = (cx - v.tx) / v.k;
      const ly = (cy - v.ty) / v.k;
      return { k: k2, tx: cx - lx * k2, ty: cy - ly * k2 };
    });
  const reset = () => setView({ k: 1, tx: 0, ty: 0 });

  const sel = selectedId ? placedById.get(selectedId) : null;
  const hov = hoverId && hoverId !== selectedId ? placedById.get(hoverId) : null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-line/60 bg-plane">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-full w-full touch-none select-none"
        style={{ cursor: pan.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          onPointerUp();
          hover(null);
        }}
        onClick={onClick}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          {/* building footprint */}
          <rect
            x={PAD}
            y={PAD}
            width={BUILDING.widthFt}
            height={BUILDING.depthFt}
            fill="none"
            stroke={INK.mut}
            strokeWidth={1.5 / view.k}
          />
          {/* zone frames + labels */}
          {Object.entries(ZONES).map(([z, def]) => {
            const r = def.rect;
            const zx = r.x + PAD;
            const zy = BUILDING.depthFt - r.y - r.h + PAD;
            return (
              <g key={z}>
                <rect
                  x={zx}
                  y={zy}
                  width={r.w}
                  height={r.h}
                  fill="none"
                  stroke={ZONE_COLOR[z] ?? INK.line}
                  strokeOpacity={0.35}
                  strokeDasharray={`${6 / view.k} ${4 / view.k}`}
                  strokeWidth={1 / view.k}
                />
                <text
                  x={zx + 3}
                  y={zy - 4 / view.k}
                  fill={ZONE_COLOR[z] ?? INK.ink2}
                  fontSize={12 / view.k}
                  fontFamily="ui-monospace, monospace"
                >
                  {def.label}
                </text>
              </g>
            );
          })}

          <BayLayer placed={placed} fills={fills} dimmed={matched} />

          {/* hover glow overlay */}
          {hov && (
            <rect
              x={hov.x - 0.5}
              y={hov.y - 0.5}
              width={hov.w + 1}
              height={hov.h + 1}
              fill={fills.get(hov.id)}
              stroke={INK.ink}
              strokeWidth={0.8 / view.k}
              filter="url(#glow)"
              pointerEvents="none"
            />
          )}

          {/* selection overlay */}
          {sel && (
            <rect
              x={sel.x - 1}
              y={sel.y - 1}
              width={sel.w + 2}
              height={sel.h + 2}
              fill="none"
              stroke={INK.accent}
              strokeWidth={2 / view.k}
              filter="url(#glow)"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <MapBtn onClick={() => zoomBtn(1.3)}>+</MapBtn>
        <MapBtn onClick={() => zoomBtn(1 / 1.3)}>−</MapBtn>
        <MapBtn onClick={reset} title="Reset view">
          ⟲
        </MapBtn>
      </div>

      {/* scale + zoom readout */}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-surf-2/80 px-2 py-1 font-mono text-[10px] text-ink-mut">
        {(view.k * 100).toFixed(0)}% · {BUILDING.widthFt}×{BUILDING.depthFt} ft
      </div>

      <Legend colorBy={colorBy} />
    </div>
  );
}

function MapBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid h-8 w-8 place-items-center rounded-md border border-line/60 bg-surf-2/90 text-ink-2 hover:bg-surf-3 hover:text-ink"
    >
      {children}
    </button>
  );
}
