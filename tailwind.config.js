/** @type {import('tailwindcss').Config} */
// Dark "control-room" design tokens (mirrors the approved mockup).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        plane: "#080b11",
        surf: { 1: "#0e1420", 2: "#141d2b", 3: "#1b2636" },
        line: "#243245",
        ink: { DEFAULT: "#e8eef7", 2: "#9aa9bd", mut: "#5f6f84" },
        accent: { DEFAULT: "#34e4ea", deep: "#0e8f9e" },
        // utilization status ramp (kept separate from the accent)
        util: { low: "#27c37e", mod: "#f4b740", high: "#f2624a", none: "#37424f" },
      },
      fontFamily: {
        mono: ["ui-monospace", "SF Mono", "JetBrains Mono", "Menlo", "monospace"],
      },
      keyframes: {
        fishbob: {
          "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%": { transform: "translateY(-8px) rotate(1deg)" },
        },
        wormwiggle: {
          "0%, 100%": { transform: "rotate(-6deg)" },
          "50%": { transform: "rotate(6deg)" },
        },
        bubble: {
          "0%": { transform: "translateY(0) scale(0.6)", opacity: "0" },
          "20%": { opacity: "0.6" },
          "100%": { transform: "translateY(-110vh) scale(1)", opacity: "0" },
        },
        sway: {
          "0%, 100%": { transform: "rotate(-6deg)" },
          "50%": { transform: "rotate(6deg)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        fishbob: "fishbob 3s ease-in-out infinite",
        wormwiggle: "wormwiggle 1.6s ease-in-out infinite",
        bubble: "bubble 8s linear infinite",
        sway: "sway 4s ease-in-out infinite",
        sparkle: "sparkle 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
