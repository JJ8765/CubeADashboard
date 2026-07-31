/**
 * Heads-up display: the hunger meter (turns red as you starve), worms-eaten
 * counter with progress toward the next Jordan encounter, and unlocked-ability
 * badges.
 */

import { useGame } from "@/game/store";
import { ABILITY_BY_ID } from "@/game/data/abilities";
import { CONFIG } from "@/game/engine/logic";

export function Hud() {
  const hunger = useGame((s) => s.hunger);
  const hungerMax = useGame((s) => s.hungerMax);
  const wormsEaten = useGame((s) => s.wormsEaten);
  const abilities = useGame((s) => s.abilities);

  const pct = Math.max(0, Math.min(100, (hunger / hungerMax) * 100));
  const barColor =
    pct > 55 ? "bg-emerald-400" : pct > 25 ? "bg-amber-400" : "bg-red-500";
  const toBoss = CONFIG.wormsPerBoss - (wormsEaten % CONFIG.wormsPerBoss);

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* hunger meter */}
      <div className="min-w-[220px] flex-1">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white/80">
          <span>Fullness</span>
          <span>
            {Math.round(hunger)} / {hungerMax}
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full border border-white/25 bg-black/40">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* worms eaten + boss countdown */}
      <div className="text-center">
        <div className="font-mono text-2xl font-bold text-white">{wormsEaten}</div>
        <div className="text-[10px] uppercase tracking-wide text-white/60">
          worms eaten · {toBoss} to Jordan
        </div>
      </div>

      {/* abilities */}
      <div className="flex items-center gap-2">
        {abilities.length === 0 && (
          <span className="text-xs text-white/40">no powers yet</span>
        )}
        {abilities.map((id) => {
          const a = ABILITY_BY_ID[id];
          return (
            <div
              key={id}
              title={`${a.name} — ${a.description}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/50 bg-cyan-400/10 text-lg text-cyan-200"
            >
              {a.icon}
            </div>
          );
        })}
      </div>
    </div>
  );
}
