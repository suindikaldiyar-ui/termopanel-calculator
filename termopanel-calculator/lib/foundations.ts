// Каталог отделки цоколя/фундамента для AI-визуализации
export type Foundation = { id: string; name: string; swatch: string; hint: string };

export const FOUNDATIONS: Foundation[] = [
  { id: "none", name: "Без цоколя", swatch: "#EDEDED", hint: "" },
  {
    id: "graphite",
    name: "Графитовый кирпич",
    swatch: "#3A3A3D",
    hint: "dark charcoal-grey brick-look stone",
  },
  {
    id: "grey",
    name: "Серый камень",
    swatch: "#6E6A66",
    hint: "grey natural split-face stone",
  },
  {
    id: "beige",
    name: "Бежевый камень",
    swatch: "#A89578",
    hint: "warm beige stone matching the facade",
  },
];

export const getFoundation = (id?: string) =>
  FOUNDATIONS.find((f) => f.id === id) ?? FOUNDATIONS[0];
