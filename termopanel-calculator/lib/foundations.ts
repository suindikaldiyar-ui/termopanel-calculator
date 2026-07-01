// Каталог отделки цоколя/фундамента. Влияет на визуализацию и смету.
// Пока пусто — записи добавляются одной строкой в массив ниже.
export type FoundationItem = {
  id: string;
  name: string;
  image: string; // "/foundations/{id}.jpg" — превью (пока файлов нет → fallback swatch)
  swatch: string; // запасной цвет, если картинки нет
  hint: string; // подсказка для Gemini, напр. "dark charcoal brick-look stone"
  pricePerM: number; // цена за погонный метр цоколя, тг
};

export const FOUNDATIONS: FoundationItem[] = [
  // пусто — заполню позже. Пример формата:
  // { id: "graphite", name: "Графит кирпич", image: "/foundations/graphite.jpg",
  //   swatch: "#3A3A3D", hint: "dark charcoal brick-look stone", pricePerM: 4000 },
];

export const getFoundation = (id?: string | null) =>
  id ? FOUNDATIONS.find((f) => f.id === id) : undefined;
