/**
 * Passive abilities.
 * ==================
 * Unlocked automatically as the worm count climbs. Kept small for the core
 * loop; this list is the seam where a deeper ability tree will grow later.
 */

import type { Ability, AbilityId } from "@/game/types";

export const ABILITIES: Ability[] = [
  {
    id: "hookSense",
    name: "Hook Sense",
    description:
      "Inspecting a worm reveals whether a hook is hidden inside before you bite.",
    unlockAtWorms: 3,
    icon: "◎",
  },
  {
    id: "biggerBelly",
    name: "Bigger Belly",
    description: "Your stomach stretches — hold more food before you're full.",
    unlockAtWorms: 6,
    icon: "◍",
  },
  {
    id: "secondChance",
    name: "Second Chance",
    description: "Wriggle free the first time you're hooked. Once per life.",
    unlockAtWorms: 9,
    icon: "✦",
  },
];

export const ABILITY_BY_ID: Record<AbilityId, Ability> = Object.fromEntries(
  ABILITIES.map((a) => [a.id, a]),
) as Record<AbilityId, Ability>;

/** Extra max-hunger granted by Bigger Belly. */
export const BIGGER_BELLY_BONUS = 40;
