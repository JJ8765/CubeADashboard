/**
 * A single drifting worm. Hand-drawn SVG squiggle tinted by its bait. Shows a
 * faint sparkle for "special" baits, and — only once Hook Sense is unlocked —
 * a warning hook glyph when the worm is secretly hooked.
 */

import type { Worm } from "@/game/types";

interface WormSpriteProps {
  worm: Worm;
  /** Reveal hidden hooks (Hook Sense unlocked). */
  revealHooks: boolean;
  selected: boolean;
  onClick: () => void;
}

export function WormSprite({ worm, revealHooks, selected, onClick }: WormSpriteProps) {
  const { bait, hooked } = worm;
  const danger = revealHooks && hooked;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 transition ${
        selected ? "scale-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" : "hover:scale-110"
      }`}
      style={{ left: `${worm.x}%`, top: `${worm.y}%` }}
      aria-label={`worm: ${bait.name}`}
    >
      <div className="animate-wormwiggle" style={{ animationDelay: `${worm.phase}s` }}>
        <svg width="52" height="30" viewBox="0 0 52 30" role="img">
          {danger && (
            <path
              d="M40 4 q7 0 7 8 q0 6 -6 6"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
          {/* fishing line hint above a hooked worm */}
          {danger && <line x1="40" y1="1" x2="40" y2="5" stroke="#cbd5e1" strokeWidth="1.5" />}
          <path
            d="M6 15 q6 -9 12 0 q6 9 12 0 q4 -6 9 -3"
            fill="none"
            stroke={bait.color}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* head */}
          <circle cx="6" cy="15" r="5" fill={bait.color} />
          <circle cx="4.5" cy="13.5" r="1.3" fill="#2a2440" />
          {bait.special && (
            <text x="30" y="9" fontSize="9" className="animate-sparkle">
              ✦
            </text>
          )}
        </svg>
      </div>
      {danger && (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
          !
        </span>
      )}
    </button>
  );
}
