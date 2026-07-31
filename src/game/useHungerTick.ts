/**
 * Drives the hunger clock. While the game is actively being played, ticks the
 * store roughly once a second so hunger drains in real time — the pressure that
 * makes hesitating dangerous.
 */

import { useEffect } from "react";
import { useGame } from "@/game/store";

const TICK_MS = 1000;

export function useHungerTick(): void {
  const phase = useGame((s) => s.phase);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, tick]);
}
