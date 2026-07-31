/**
 * Title screen. Sets the tone, teaches the two ways to die, and drops the fish
 * into the water on "Dive in".
 */

import { useGame } from "@/game/store";
import { Scenery } from "@/game/art/Scenery";
import { FishSprite } from "@/game/art/FishSprite";

export function StartScreen() {
  const startGame = useGame((s) => s.startGame);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-cyan-200/10 bg-gradient-to-b from-[#155e75] via-[#0e4a63] to-[#082f43] text-center">
      <Scenery />

      <div className="relative z-10 flex flex-col items-center gap-5 px-6">
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.3)]">
          NIBBLE
        </h1>
        <p className="max-w-md text-sm text-cyan-100/80">
          You're a little fish in a big, hungry sea. Eat worms to stay full — but
          watch out: some are <span className="text-red-300">sus</span> and hide a
          hook. Eat enough and you'll grow strange new powers.
        </p>

        <FishSprite size={140} />

        <div className="flex flex-col gap-1 text-xs text-cyan-100/70">
          <span>💀 Let your fullness hit zero and you <b>starve</b>.</span>
          <span>🪝 Bite a hooked worm and you're <b>reeled up</b>.</span>
          <span>🎣 Every 10 worms, <b>Jordan the Fisherman</b> comes calling.</span>
        </div>

        <button
          type="button"
          onClick={startGame}
          className="mt-2 rounded-full border-2 border-yellow-300 bg-yellow-300/10 px-8 py-3 text-lg font-bold uppercase tracking-wide text-yellow-200 transition hover:bg-yellow-300 hover:text-black"
        >
          Dive in
        </button>
      </div>
    </div>
  );
}
