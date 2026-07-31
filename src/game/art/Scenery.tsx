/**
 * Ambient underwater scenery — rising bubbles and swaying seaweed, all CSS/SVG,
 * no external assets. Purely decorative; sits behind the worm field.
 */

const BUBBLES = [
  { left: "8%", size: 10, delay: "0s", dur: "7s" },
  { left: "22%", size: 6, delay: "1.4s", dur: "9s" },
  { left: "38%", size: 14, delay: "3s", dur: "6.5s" },
  { left: "55%", size: 8, delay: "0.7s", dur: "8.5s" },
  { left: "68%", size: 5, delay: "2.2s", dur: "10s" },
  { left: "81%", size: 12, delay: "4s", dur: "7.5s" },
  { left: "92%", size: 7, delay: "1s", dur: "9.5s" },
];

const WEEDS = [
  { left: "4%", h: 130, hue: "#1f7a5a", delay: "0s" },
  { left: "16%", h: 90, hue: "#2a9d6f", delay: "0.6s" },
  { left: "84%", h: 110, hue: "#1f7a5a", delay: "0.3s" },
  { left: "95%", h: 150, hue: "#2a9d6f", delay: "0.9s" },
];

export function Scenery() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* light rays */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.06)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.05)_100%)]" />

      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full bg-white/25 animate-bubble"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animationDelay: b.delay,
            animationDuration: b.dur,
          }}
        />
      ))}

      {WEEDS.map((w, i) => (
        <div
          key={i}
          className="absolute bottom-0 origin-bottom animate-sway"
          style={{ left: w.left, animationDelay: w.delay }}
        >
          <svg width="34" height={w.h} viewBox={`0 0 34 ${w.h}`}>
            <path
              d={`M17 ${w.h} C4 ${w.h * 0.7} 30 ${w.h * 0.45} 15 ${w.h * 0.28} C6 ${
                w.h * 0.16
              } 24 ${w.h * 0.08} 17 0`}
              fill="none"
              stroke={w.hue}
              strokeWidth="7"
              strokeLinecap="round"
              opacity="0.75"
            />
          </svg>
        </div>
      ))}

      {/* sandy floor */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#123043] to-transparent" />
    </div>
  );
}
