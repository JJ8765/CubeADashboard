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
    },
  },
  plugins: [],
};
