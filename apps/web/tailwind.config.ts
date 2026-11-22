import type { Config } from "tailwindcss";

/** Keep in sync with packages/shared BRAND_COLORS (Concept A × MGIMO). */
const brand = {
  ink: "#162256",
  cream: "#F3F4F8",
  copper: "#18488B",
  "copper-dark": "#123A6E",
  "ink-muted": "#5A6478",
  "cream-deep": "#E8EAF2",
  accent: "#C32827",
  link: "#1586C8",
} as const;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ...brand,
      },
      fontFamily: {
        // Campus/MGIMO: geometric sans only (Montserrat). serif alias → same stack.
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        serif: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 40px rgba(22, 34, 86, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
