/**
 * Game-over screen. Reports how the run ended (starved vs. hooked), the final
 * worm tally, and offers a restart.
 */

import { useGame } from "@/game/store";

export function GameOverScreen() {
  const deathCause = useGame((s) => s.deathCause);
  const wormsEaten = useGame((s) => s.wormsEaten);
  const message = useGame((s) => s.message);
  const restart = useGame((s) => s.restart);

  const hooked = deathCause === "hooked";

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0a1a24] to-[#05070d] text-center">
      <div className="relative z-10 flex max-w-md flex-col items-center gap-5 px-6">
        <div className="text-6xl">{hooked ? "🪝" : "💀"}</div>
        <h2 className="text-4xl font-black uppercase tracking-tight text-white">
          {hooked ? "Hooked!" : "Starved"}
        </h2>
        <p className="font-mono text-sm text-white/70">{message}</p>

        <div className="rounded-lg border border-white/15 bg-white/5 px-6 py-3">
          <div className="font-mono text-3xl font-bold text-cyan-200">{wormsEaten}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/50">
            worms eaten this life
          </div>
        </div>

        <button
          type="button"
          onClick={restart}
          className="rounded-full border-2 border-cyan-300 bg-cyan-300/10 px-8 py-3 font-bold uppercase tracking-wide text-cyan-200 transition hover:bg-cyan-300 hover:text-black"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
