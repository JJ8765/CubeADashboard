/**
 * Shared color system for the map, legend and dashboard.
 * ======================================================
 * Mirrors the dark "control-room" tokens in tailwind.config.js so the SVG map
 * (which needs raw hex, not classes) stays in lock-step with the rest of the UI.
 */

import type { UtilBand } from "@/domain/calc/utilization";

/** Utilization ramp — the primary "Color by utilization" legend. */
export const UTIL_COLOR: Record<UtilBand, string> = {
  low: "#27c37e", // green  — headroom
  moderate: "#f4b740", // amber  — filling up
  high: "#f2624a", // red    — tight
  none: "#37424f", // gray   — unassigned / empty
};

export const UTIL_LABEL: Record<UtilBand, string> = {
  low: "Low (< 60%)",
  moderate: "Moderate (60–85%)",
  high: "High (≥ 85%)",
  none: "Unassigned / empty",
};

/** Zone colors — the "Color by zone" legend. */
export const ZONE_COLOR: Record<string, string> = {
  Retail: "#34e4ea",
  Wholesale: "#f4b740",
  MODs: "#27c37e",
  Dock: "#f2624a",
};

/**
 * A stable, well-spread categorical palette for departments / rack codes — any
 * key hashes deterministically to one slot so colors never shuffle between
 * renders.
 */
export const CATEGORICAL = [
  "#34e4ea", "#7c9cff", "#27c37e", "#f4b740", "#f2624a", "#c78bff",
  "#4fd1c5", "#f78fb3", "#9ad34f", "#ffab5e", "#5fb0ff", "#e06c9f",
];

export function categoricalColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff;
  return CATEGORICAL[h % CATEGORICAL.length];
}

/** Neutral tokens (kept here so components can reference one source). */
export const INK = {
  plane: "#080b11",
  surf1: "#0e1420",
  surf2: "#141d2b",
  surf3: "#1b2636",
  line: "#243245",
  ink: "#e8eef7",
  ink2: "#9aa9bd",
  mut: "#5f6f84",
  accent: "#34e4ea",
};
