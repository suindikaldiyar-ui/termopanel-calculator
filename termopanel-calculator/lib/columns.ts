// Каталог угловых колонн (пилястр на углах дома). Фото-референс для Gemini.
// Влияет ТОЛЬКО на визуализацию (на смету пока не влияет).
export type ColumnItem = {
  id: string;
  name: string;
  image: string; // "/columns/{id}.jpg"
  hint: string; // текст-подсказка для Gemini
};

export const COLUMNS: ColumnItem[] = [
  {
    id: "column1",
    name: "Классика",
    image: "/columns/column1.jpg",
    hint: "white classic corner column/pilaster with rectangular raised panels and a capital on top, like the reference image",
  },
];

export const getColumn = (id?: string | null) =>
  id ? COLUMNS.find((c) => c.id === id) : undefined;
