/**
 * Pure game logic.
 * ================
 * No React, no store, no randomness that isn't injected — every function here
 * is a plain input→output transform so the rules can be unit-tested directly
 * (see tests/game.test.ts). The Zustand store (store.ts) wires these outcomes
 * into live state and the drifting worm field.
 */

import type { AbilityId, DeathCause, Worm } from "@/game/types";
import { ABILITIES, BIGGER_BELLY_BONUS } from "@/game/data/abilities";

export const CONFIG = {
  hungerStart: 55,
  hungerBaseMax: 100,
  /** Hunger lost per tick (~1 tick/second). */
  hungerDecayPerTick: 3,
  /** Worms drifting in the pond at once. */
  pondSize: 4,
  /** Boss appears every N worms eaten. */
  wormsPerBoss: 10,
} as const;

/** Max hunger given the abilities unlocked (Bigger Belly widens the belly). */
export function maxHungerFor(abilities: AbilityId[]): number {
  const belly = abilities.includes("biggerBelly") ? BIGGER_BELLY_BONUS : 0;
  return CONFIG.hungerBaseMax + belly;
}

/** All ability ids unlocked at a given worms-eaten count. */
export function unlockedAbilitiesFor(count: number): AbilityId[] {
  return ABILITIES.filter((a) => count >= a.unlockAtWorms).map((a) => a.id);
}

/** Abilities gained by moving from `prevCount` to `nextCount` worms. */
export function newlyUnlocked(prevCount: number, nextCount: number): AbilityId[] {
  const before = new Set(unlockedAbilitiesFor(prevCount));
  return unlockedAbilitiesFor(nextCount).filter((id) => !before.has(id));
}

/** Jordan is due every `wormsPerBoss` worms (but not at zero). */
export function isBossDue(count: number): boolean {
  return count > 0 && count % CONFIG.wormsPerBoss === 0;
}

export interface EatOutcome {
  hunger: number;
  hungerMax: number;
  wormsEaten: number;
  abilities: AbilityId[];
  secondChanceUsed: boolean;
  death: DeathCause;
  /** True when Second Chance saved the fish from a hook. */
  savedByChance: boolean;
  bossDue: boolean;
  newAbilities: AbilityId[];
  message: string;
}

/**
 * Resolve eating a worm from the given state.
 * - Hooked worm → death, unless Second Chance is available (spent here).
 * - Safe worm → restore hunger (clamped), tick the counter, roll new unlocks,
 *   and flag a boss encounter on every 10th worm.
 */
export function applyEat(
  state: {
    hunger: number;
    wormsEaten: number;
    abilities: AbilityId[];
    secondChanceUsed: boolean;
  },
  worm: Pick<Worm, "hooked" | "bait">,
): EatOutcome {
  const base = {
    hunger: state.hunger,
    hungerMax: maxHungerFor(state.abilities),
    wormsEaten: state.wormsEaten,
    abilities: state.abilities,
    secondChanceUsed: state.secondChanceUsed,
    death: null as DeathCause,
    savedByChance: false,
    bossDue: false,
    newAbilities: [] as AbilityId[],
    message: "",
  };

  if (worm.hooked) {
    const canEscape =
      state.abilities.includes("secondChance") && !state.secondChanceUsed;
    if (canEscape) {
      return {
        ...base,
        secondChanceUsed: true,
        savedByChance: true,
        message: "A hook! You thrash and — snap! You wriggle free, just once.",
      };
    }
    return {
      ...base,
      death: "hooked",
      message: "A hook bites deep. You're reeled up toward the light…",
    };
  }

  const nextCount = state.wormsEaten + 1;
  const newAbilities = newlyUnlocked(state.wormsEaten, nextCount);
  const abilities = newAbilities.length
    ? unlockedAbilitiesFor(nextCount)
    : state.abilities;
  const hungerMax = maxHungerFor(abilities);
  const hunger = Math.min(hungerMax, state.hunger + worm.bait.hungerRestore);

  return {
    ...base,
    hunger,
    hungerMax,
    wormsEaten: nextCount,
    abilities,
    newAbilities,
    bossDue: isBossDue(nextCount),
    message: `You gulp down the ${worm.bait.name}. ${worm.bait.flavor}`,
  };
}

export interface TickOutcome {
  hunger: number;
  death: DeathCause;
}

/** One hunger tick. Reaching zero starves the fish. */
export function applyTick(state: { hunger: number }): TickOutcome {
  const hunger = Math.max(0, state.hunger - CONFIG.hungerDecayPerTick);
  return { hunger, death: hunger <= 0 ? "starve" : null };
}
