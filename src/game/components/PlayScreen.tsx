/**
 * The main play scene: underwater backdrop, HUD, the fish, the drifting worm
 * field, and the dialog box that narrates events and offers Eat / Leave it when
 * a worm is being inspected.
 */

import { useEffect, useState } from "react";
import { useGame } from "@/game/store";
import { useHungerTick } from "@/game/useHungerTick";
import { Scenery } from "@/game/art/Scenery";
import { FishSprite } from "@/game/art/FishSprite";
import { WormSprite } from "@/game/components/WormSprite";
import { DialogBox } from "@/game/components/DialogBox";
import { Hud } from "@/game/components/Hud";

export function PlayScreen() {
  useHungerTick();

  const worms = useGame((s) => s.worms);
  const inspecting = useGame((s) => s.inspecting);
  const message = useGame((s) => s.message);
  const abilities = useGame((s) => s.abilities);
  const inspectWorm = useGame((s) => s.inspectWorm);
  const eatWorm = useGame((s) => s.eatWorm);
  const leaveWorm = useGame((s) => s.leaveWorm);

  const revealHooks = abilities.includes("hookSense");
  const selected = worms.find((w) => w.uid === inspecting) ?? null;

  // brief chomp animation on the fish when a worm is eaten
  const [chomp, setChomp] = useState(false);
  const wormsEaten = useGame((s) => s.wormsEaten);
  useEffect(() => {
    if (wormsEaten === 0) return;
    setChomp(true);
    const id = window.setTimeout(() => setChomp(false), 260);
    return () => window.clearTimeout(id);
  }, [wormsEaten]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm">
        <Hud />
      </div>

      {/* pond */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-cyan-200/10 bg-gradient-to-b from-[#155e75] via-[#0e4a63] to-[#082f43]">
        <Scenery />

        {/* the fish */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          <FishSprite eating={chomp} />
        </div>

        {/* worms */}
        {worms.map((w) => (
          <WormSprite
            key={w.uid}
            worm={w}
            revealHooks={revealHooks}
            selected={w.uid === inspecting}
            onClick={() => inspectWorm(w.uid)}
          />
        ))}
      </div>

      {/* dialog */}
      <DialogBox
        text={selected ? selected.bait.flavor : message}
        actions={
          selected
            ? [
                { label: "Eat", tone: "eat", onClick: () => eatWorm(selected.uid) },
                { label: "Leave it", tone: "leave", onClick: () => leaveWorm(selected.uid) },
              ]
            : undefined
        }
      />
    </div>
  );
}
