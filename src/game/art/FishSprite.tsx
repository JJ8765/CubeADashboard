/**
 * The player fish — a cute hand-drawn SVG. Bobs gently while idle and opens
 * its mouth when `eating` is set (a quick chomp the PlayScreen toggles).
 */

interface FishSpriteProps {
  eating?: boolean;
  size?: number;
}

export function FishSprite({ eating = false, size = 120 }: FishSpriteProps) {
  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="0 0 100 72"
      className="animate-fishbob drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
      role="img"
      aria-label="a cute fish"
    >
      {/* tail */}
      <path
        d="M14 36 L1 22 Q6 36 1 50 Z"
        fill="#ff9e6d"
        stroke="#e07a44"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* body */}
      <ellipse
        cx="52"
        cy="36"
        rx="38"
        ry="24"
        fill="#ffb27d"
        stroke="#e07a44"
        strokeWidth="2"
      />
      {/* top fin */}
      <path
        d="M40 14 Q52 2 64 15 Z"
        fill="#ff9e6d"
        stroke="#e07a44"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* belly shimmer */}
      <ellipse cx="52" cy="46" rx="26" ry="11" fill="#ffd1a8" opacity="0.7" />
      {/* cheek */}
      <circle cx="74" cy="42" r="5" fill="#ff8fb0" opacity="0.6" />
      {/* eye */}
      <circle cx="76" cy="30" r="7" fill="#fff" stroke="#e07a44" strokeWidth="1.5" />
      <circle cx="78" cy="31" r="3.4" fill="#2a2440" />
      <circle cx="79.4" cy="29.6" r="1.1" fill="#fff" />
      {/* mouth — chomps open while eating */}
      {eating ? (
        <ellipse cx="88" cy="41" rx="4" ry="5" fill="#7a3b3b" />
      ) : (
        <path d="M84 41 Q88 44 91 41" stroke="#c25a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
