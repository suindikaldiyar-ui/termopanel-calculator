import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Люкс: тёмный тёплый графит + золото
        canvas: "#14110E", // фон страницы
        surface: "#1E1A15", // карточки/панели
        line: "#2E2820", // тонкие рамки/разделители
        ink: "#F2EDE3", // основной текст (тёплый белый)
        muted: "#9C9384", // приглушённый текст
        gold: "#C9A24B", // основной акцент
        goldLight: "#E3C06A", // ховер / хайлайты / градиент
        bonus: "#3E7D5C", // бонус-метка (приглушённая зелёная)
        stone: "#1A1611", // тёмная плашка (header)
        // legacy-алиас: старые классы `terracotta` (в визуализаторе) → золото
        terracotta: "#C9A24B",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // мягкая тёплая тень под тёмную тему
        card: "0 1px 2px rgba(0,0,0,0.35), 0 12px 32px rgba(0,0,0,0.35)",
        gold: "0 8px 28px rgba(201,162,75,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
