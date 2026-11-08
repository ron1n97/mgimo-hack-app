import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1C2C",
        cream: "#F3EADC",
        copper: "#C45C26",
        "copper-dark": "#9A4519",
        "ink-muted": "#3A4F63",
        "cream-deep": "#E8D9C4",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        serif: ["var(--font-spectral)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 12px 40px rgba(11, 28, 44, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
