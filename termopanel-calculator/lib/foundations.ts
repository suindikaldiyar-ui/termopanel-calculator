// Каталог отделки цоколя/фундамента. Влияет ТОЛЬКО на визуализацию (промпт Gemini).
// На смету НЕ влияет — базовая строка «Фундамент» считается всегда (см. lib/calc.ts).
export type FoundationItem = {
  id: string;
  name: string;
  image: string; // "/foundations/{id}.jpg" — превью (нет файла → fallback swatch)
  swatch: string; // запасной цвет, если картинки нет
  hint: string; // подсказка для Gemini, напр. "dark charcoal brick-look stone"
  pricePerM: number; // не используется в смете (цоколь из каталога = только визуал)
};

export const FOUNDATIONS: FoundationItem[] = [
  {
    id: "panel3d",
    name: "3D панель",
    image: "/foundations/panel3d.jpg",
    swatch: "#8B7A6B",
    hint: "3D beveled brick-look facade panels, taupe/mauve color, protruding rectangular blocks like the reference photo",
    pricePerM: 0,
  },
];

export const getFoundation = (id?: string | null) =>
  id ? FOUNDATIONS.find((f) => f.id === id) : undefined;
