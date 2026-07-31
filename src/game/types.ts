/**
 * Nibble — core game types.
 * =========================
 * A cute, click-based underwater RPG. You're a fish; you eat worms to survive.
 * Two ways to die: starve (hunger hits 0) or get hooked (eat a "sus" worm).
 *
 * Game logic is kept pure (see engine/logic.ts) and consumed by a Zustand
 * store (store.ts); these types are shared by both and by the React UI.
 */

/** A kind of worm bait. Static definition, authored in data/baits.ts. */
export interface Bait {
  id: string;
  name: string;
  /** Flavor line shown Undertale-style when the worm is inspected. */
  flavor: string;
  /** How much hunger this restores when safely eaten (0..100 scale). */
  hungerRestore: number;
  /** Probability [0..1] that any given instance of this bait is hooked. */
  hookChance: number;
  /** SVG body color. */
  color: string;
  /** Relative spawn weight (higher = more common). */
  weight: number;
  /** Marked "special" — rarer, tastier, sometimes ability-flavored. */
  special?: boolean;
}

/** A live worm drifting in the pond — one concrete instance of a Bait. */
export interface Worm {
  /** Unique per spawn. */
  uid: string;
  bait: Bait;
  /** Rolled once at spawn: is there a hook hidden in this one? */
  hooked: boolean;
  /** Horizontal drift lane, 0..100 (% of the pond width). */
  x: number;
  /** Vertical position, 0..100 (% of the pond height). */
  y: number;
  /** Animation phase offset so worms don't wiggle in lockstep. */
  phase: number;
}

/** A passive ability unlocked by a worms-eaten milestone. */
export interface Ability {
  id: AbilityId;
  name: string;
  description: string;
  /** Unlocks once the player has eaten this many worms. */
  unlockAtWorms: number;
  icon: string;
}

export type AbilityId = "hookSense" | "biggerBelly" | "secondChance";

export type GamePhase = "start" | "playing" | "boss" | "gameover";

export type DeathCause = "starve" | "hooked" | null;

export interface GameState {
  phase: GamePhase;
  hunger: number;
  hungerMax: number;
  wormsEaten: number;
  /** Ability ids currently unlocked. */
  abilities: AbilityId[];
  /** Worms currently drifting in the pond. */
  worms: Worm[];
  /** The worm the player is currently inspecting (uid), if any. */
  inspecting: string | null;
  /** How the run ended, once phase === "gameover". */
  deathCause: DeathCause;
  /** Rolling narration line shown in the dialog box. */
  message: string;
  /** Whether the one-time Second Chance save has been spent this run. */
  secondChanceUsed: boolean;
}
