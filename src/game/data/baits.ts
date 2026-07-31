/**
 * The worm roster.
 * ================
 * A small but wacky set of baits for the core loop. Each carries a hunger
 * value and a hook chance — the "sus" baits look tasty but are far more likely
 * to hide a hook. Spawn frequency is controlled by `weight`.
 */

import type { Bait } from "@/game/types";

export const BAITS: Bait[] = [
  {
    id: "garden",
    name: "Garden Worm",
    flavor: "A plain, honest worm. It wiggles without a care in the world.",
    hungerRestore: 14,
    hookChance: 0.08,
    color: "#d98a6a",
    weight: 10,
  },
  {
    id: "grub",
    name: "Fat Grub",
    flavor: "Plump and glistening. Practically a whole meal on its own.",
    hungerRestore: 28,
    hookChance: 0.14,
    color: "#e8c07d",
    weight: 6,
  },
  {
    id: "bubble",
    name: "Bubble Worm",
    flavor: "It's mostly air, but it tickles going down. Hee hee.",
    hungerRestore: 9,
    hookChance: 0.05,
    color: "#8fd3e8",
    weight: 7,
  },
  {
    id: "neon",
    name: "Neon Wiggler",
    flavor: "Suspiciously bright. Tastes like blue raspberry and static.",
    hungerRestore: 22,
    hookChance: 0.2,
    color: "#7cf29b",
    weight: 4,
    special: true,
  },
  {
    id: "glow",
    name: "Glow Worm",
    flavor: "A soft lantern in the dark. Warm, calm, and very filling.",
    hungerRestore: 34,
    hookChance: 0.12,
    color: "#f4e07a",
    weight: 3,
    special: true,
  },
  {
    id: "rusty",
    name: "Rusty Lure",
    flavor: "It smells like a meal and a mistake. Something metallic glints.",
    hungerRestore: 40,
    hookChance: 0.72,
    color: "#c46a58",
    weight: 4,
  },
];

const TOTAL_WEIGHT = BAITS.reduce((sum, b) => sum + b.weight, 0);

/** Pick a bait by weight. `rng` is injected so tests stay deterministic. */
export function pickBait(rng: () => number = Math.random): Bait {
  let roll = rng() * TOTAL_WEIGHT;
  for (const bait of BAITS) {
    roll -= bait.weight;
    if (roll <= 0) return bait;
  }
  return BAITS[0];
}
