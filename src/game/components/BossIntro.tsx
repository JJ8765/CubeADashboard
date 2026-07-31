/**
 * Jordan the Fisherman interlude.
 * ===============================
 * STUB for the core-loop milestone: every 10 worms, Jordan looms in and taunts
 * you, then drifts off so play can continue. The full multi-phase boss fight is
 * the next pass — this screen is the seam it will grow from.
 */

import { useGame } from "@/game/store";

export function BossIntro() {
  const advance = useGame((s) => s.advancePastBoss);
  const wormsEaten = useGame((s) => s.wormsEaten);
  const round = Math.floor(wormsEaten / 10);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-red-400/20 bg-gradient-to-b from-[#3a1d2b] via-[#241b2e] to-[#0d1420] text-center">
      <div className="relative z-10 flex max-w-lg flex-col items-center gap-5 px-6">
        {/* Jordan — a looming silhouette above the water */}
        <svg width="150" height="150" viewBox="0 0 120 120" aria-label="Jordan the Fisherman">
          <circle cx="60" cy="40" r="22" fill="#e8b98f" stroke="#2a2440" strokeWidth="3" />
          <path d="M30 30 Q60 4 90 30 L90 22 Q60 -4 30 22 Z" fill="#3b7a4a" stroke="#2a2440" strokeWidth="3" />
          <path d="M28 92 Q60 60 92 92 L92 120 L28 120 Z" fill="#c65b3c" stroke="#2a2440" strokeWidth="3" />
          <line x1="96" y1="26" x2="118" y2="118" stroke="#7a5230" strokeWidth="3" />
          <circle cx="52" cy="40" r="3" fill="#2a2440" />
          <circle cx="68" cy="40" r="3" fill="#2a2440" />
          <path d="M52 52 Q60 58 68 52" stroke="#2a2440" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>

        <h2 className="text-3xl font-black uppercase tracking-tight text-red-200">
          Jordan the Fisherman
        </h2>
        <p className="text-sm italic text-red-100/80">
          {round <= 1
            ? "“Well, well. That's a plump little fish. I'll be seeing you again.”"
            : `“Still wriggling, are we? Round ${round}. One of these worms has your name on it.”`}
        </p>
        <p className="text-xs text-white/40">
          (The full showdown is coming soon — for now, Jordan just sizes you up.)
        </p>

        <button
          type="button"
          onClick={advance}
          className="mt-1 rounded-full border-2 border-red-300 bg-red-300/10 px-7 py-2.5 font-bold uppercase tracking-wide text-red-200 transition hover:bg-red-300 hover:text-black"
        >
          Swim on
        </button>
      </div>
    </div>
  );
}
