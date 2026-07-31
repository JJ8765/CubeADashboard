/**
 * Game root. Switches between the four phases (start / playing / boss / gameover)
 * off the store. Mounted by src/App.tsx as the whole app on this branch.
 */

import { useGame } from "@/game/store";
import { StartScreen } from "@/game/components/StartScreen";
import { PlayScreen } from "@/game/components/PlayScreen";
import { BossIntro } from "@/game/components/BossIntro";
import { GameOverScreen } from "@/game/components/GameOverScreen";

export function GameApp() {
  const phase = useGame((s) => s.phase);

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col p-3 sm:p-5">
      {phase === "start" && <StartScreen />}
      {phase === "playing" && <PlayScreen />}
      {phase === "boss" && <BossIntro />}
      {phase === "gameover" && <GameOverScreen />}
    </div>
  );
}
