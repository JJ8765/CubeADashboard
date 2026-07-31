import { describe, expect, it } from "vitest";
import {
  applyEat,
  applyTick,
  CONFIG,
  isBossDue,
  maxHungerFor,
  newlyUnlocked,
  unlockedAbilitiesFor,
} from "@/game/engine/logic";
import { BIGGER_BELLY_BONUS } from "@/game/data/abilities";
import type { AbilityId, Worm } from "@/game/types";

const bait = (over: Partial<Worm["bait"]> = {}): Worm["bait"] => ({
  id: "test",
  name: "Test Worm",
  flavor: "A worm for testing.",
  hungerRestore: 20,
  hookChance: 0,
  color: "#fff",
  weight: 1,
  ...over,
});

const safeWorm = { hooked: false, bait: bait() };
const hookedWorm = { hooked: true, bait: bait({ hookChance: 1 }) };

describe("ability unlocks", () => {
  it("unlocks by worms-eaten milestone", () => {
    expect(unlockedAbilitiesFor(0)).toEqual([]);
    expect(unlockedAbilitiesFor(3)).toContain("hookSense");
    expect(unlockedAbilitiesFor(6)).toEqual(
      expect.arrayContaining(["hookSense", "biggerBelly"]),
    );
    expect(unlockedAbilitiesFor(9)).toContain("secondChance");
  });

  it("reports only abilities gained across a step", () => {
    expect(newlyUnlocked(2, 3)).toEqual(["hookSense"]);
    expect(newlyUnlocked(3, 4)).toEqual([]);
  });

  it("Bigger Belly raises max hunger", () => {
    expect(maxHungerFor([])).toBe(CONFIG.hungerBaseMax);
    expect(maxHungerFor(["biggerBelly"])).toBe(
      CONFIG.hungerBaseMax + BIGGER_BELLY_BONUS,
    );
  });
});

describe("eating", () => {
  const base = { hunger: 50, wormsEaten: 0, abilities: [] as AbilityId[], secondChanceUsed: false };

  it("restores hunger and counts the worm", () => {
    const out = applyEat(base, safeWorm);
    expect(out.death).toBeNull();
    expect(out.hunger).toBe(70);
    expect(out.wormsEaten).toBe(1);
  });

  it("clamps hunger to the max", () => {
    const out = applyEat({ ...base, hunger: 95 }, safeWorm);
    expect(out.hunger).toBe(CONFIG.hungerBaseMax);
  });

  it("a hooked worm kills without a saving ability", () => {
    const out = applyEat(base, hookedWorm);
    expect(out.death).toBe("hooked");
    expect(out.wormsEaten).toBe(0);
  });

  it("Second Chance survives a hook exactly once", () => {
    const armed = { ...base, abilities: ["secondChance"] as AbilityId[] };
    const first = applyEat(armed, hookedWorm);
    expect(first.death).toBeNull();
    expect(first.savedByChance).toBe(true);
    expect(first.secondChanceUsed).toBe(true);

    const second = applyEat(
      { ...armed, secondChanceUsed: true },
      hookedWorm,
    );
    expect(second.death).toBe("hooked");
  });

  it("flags a boss on every 10th worm", () => {
    const out = applyEat({ ...base, wormsEaten: 9 }, safeWorm);
    expect(out.bossDue).toBe(true);
  });

  it("surfaces a freshly-unlocked ability on the worm that crosses it", () => {
    const out = applyEat({ ...base, wormsEaten: 8 }, safeWorm);
    expect(out.wormsEaten).toBe(9);
    expect(out.newAbilities).toContain("secondChance");
  });
});

describe("hunger tick", () => {
  it("drains hunger each tick", () => {
    expect(applyTick({ hunger: 50 }).hunger).toBe(50 - CONFIG.hungerDecayPerTick);
  });

  it("starves at zero", () => {
    const out = applyTick({ hunger: 1 });
    expect(out.hunger).toBe(0);
    expect(out.death).toBe("starve");
  });
});

describe("boss cadence", () => {
  it("is due every 10 worms, not at zero", () => {
    expect(isBossDue(0)).toBe(false);
    expect(isBossDue(10)).toBe(true);
    expect(isBossDue(15)).toBe(false);
    expect(isBossDue(20)).toBe(true);
  });
});
