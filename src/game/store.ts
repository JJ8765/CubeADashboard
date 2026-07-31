/**
 * Game store (Zustand).
 * =====================
 * Holds the live GameState and the drifting worm field, and turns player
 * actions into state by delegating the rules to the pure engine (engine/logic).
 * The store owns only the "impure" bits: randomness, the worm list, and which
 * worm is being inspected.
 */

import { create } from "zustand";
import type { GameState, Worm } from "@/game/types";
import { pickBait } from "@/game/data/baits";
import {
  applyEat,
  applyTick,
  CONFIG,
  maxHungerFor,
} from "@/game/engine/logic";

let uidSeq = 0;

/** Spawn a fresh worm: pick a bait, roll its hook, drop it in a random spot. */
function makeWorm(): Worm {
  const bait = pickBait();
  return {
    uid: `w${uidSeq++}`,
    bait,
    hooked: Math.random() < bait.hookChance,
    x: 12 + Math.random() * 76,
    y: 18 + Math.random() * 60,
    phase: Math.random() * Math.PI * 2,
  };
}

function fillPond(worms: Worm[]): Worm[] {
  const next = worms.slice();
  while (next.length < CONFIG.pondSize) next.push(makeWorm());
  return next;
}

interface GameStore extends GameState {
  startGame: () => void;
  inspectWorm: (uid: string) => void;
  closeInspect: () => void;
  eatWorm: (uid: string) => void;
  leaveWorm: (uid: string) => void;
  tick: () => void;
  advancePastBoss: () => void;
  restart: () => void;
}

function initialState(): GameState {
  return {
    phase: "start",
    hunger: CONFIG.hungerStart,
    hungerMax: maxHungerFor([]),
    wormsEaten: 0,
    abilities: [],
    worms: [],
    inspecting: null,
    deathCause: null,
    message: "",
    secondChanceUsed: false,
  };
}

export const useGame = create<GameStore>((set, get) => ({
  ...initialState(),

  startGame: () =>
    set({
      ...initialState(),
      phase: "playing",
      worms: fillPond([]),
      message: "You slip into the cool water. Something wriggles nearby…",
    }),

  inspectWorm: (uid) => {
    const worm = get().worms.find((w) => w.uid === uid);
    if (!worm) return;
    set({ inspecting: uid, message: worm.bait.flavor });
  },

  closeInspect: () => set({ inspecting: null }),

  eatWorm: (uid) => {
    const state = get();
    if (state.phase !== "playing") return;
    const worm = state.worms.find((w) => w.uid === uid);
    if (!worm) return;

    const outcome = applyEat(state, worm);
    const remaining = state.worms.filter((w) => w.uid !== uid);

    if (outcome.death) {
      set({
        phase: "gameover",
        deathCause: outcome.death,
        message: outcome.message,
        inspecting: null,
      });
      return;
    }

    set({
      hunger: outcome.hunger,
      hungerMax: outcome.hungerMax,
      wormsEaten: outcome.wormsEaten,
      abilities: outcome.abilities,
      secondChanceUsed: outcome.secondChanceUsed,
      inspecting: null,
      // If saved by Second Chance, the hooked worm is gone but nothing eaten.
      worms: fillPond(remaining),
      phase: outcome.bossDue ? "boss" : "playing",
      message: outcome.message,
    });
  },

  leaveWorm: (uid) =>
    set((state) => ({
      inspecting: null,
      // Let it drift off; a new worm takes its place.
      worms: fillPond(state.worms.filter((w) => w.uid !== uid)),
      message: "You let it drift away. Best not to be greedy.",
    })),

  tick: () => {
    const state = get();
    if (state.phase !== "playing") return;
    const { hunger, death } = applyTick(state);
    if (death) {
      set({ phase: "gameover", deathCause: death, hunger, inspecting: null });
      return;
    }
    set({ hunger });
  },

  advancePastBoss: () =>
    set({
      phase: "playing",
      message: "Jordan's boat drifts off… for now. Keep eating.",
    }),

  restart: () => set({ ...initialState() }),
}));
