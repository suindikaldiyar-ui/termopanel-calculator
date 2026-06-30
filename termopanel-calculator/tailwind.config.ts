import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F4EF",
        surface: "#FFFFFF",
        ink: "#1F1B16",
        terracotta: "#C2683D",
        stone: "#2B2622",
        bonus: "#2F7D5B",
        line: "#E8E1D6",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,27,22,0.04), 0 8px 24px rgba(31,27,22,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
