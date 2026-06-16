import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "tempered steel" palette — the colors steel turns under heat treatment.
        // Tempering = building resilience. The accent is bronze, not the default terracotta/acid-green.
        gunmetal: "#1b1f24",
        slate: "#2b323b",
        steel: "#5b6673",
        mist: "#aeb6bf",
        temper: "#c8893a",   // bronze accent (heat-tempered steel)
        ember: "#9c5b2e",
        parchment: "#e9e4d8",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
