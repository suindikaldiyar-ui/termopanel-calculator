// ──────────────────────────────────────────
// Расчёт сметы термопанельного фасада
// ──────────────────────────────────────────
import { getFoundation } from "./foundations";
import { getDecor, type DecorItem } from "./decor";

// Нормы расхода (ЗАФИКСИРОВАНЫ — не менять)
export const NORMS = {
  GLUE_M2_PER_BAG: 8, // 1 мешок 25кг = 8 м²
  TRAVERTINE_M2_PER_BUCKET: 10, // 20кг = 1 ведро = 10 м²
  LACQUER_M2_PER_CAN: 66, // 10кг = 66 м²
  LACQUER_KG_PER_CAN: 10,
  FRAMING_M_PER_WINDOW: 8, // 1 окно = 8 м (верх + низ + 2 стороны)
  PILASTER_M_PER_CORNER: 3, // высота пилястры (упрощённо), м
  PANEL_PRICE: 3200, // термопанель, тг/м² (задано)
  FOUNDATION_PAINT_HEIGHT: 0.4, // высота окраски цоколя, м
  PAINT_L_PER_UNIT: 10, // 1 единица краски = 10 л покрытия (м² × высота)
} as const;

// Метраж декора по категории
function decorMeters(
  category: DecorItem["category"],
  windows: number,
  corners: number,
  perimeter: number
): number {
  switch (category) {
    case "obramlenie":
      return windows * NORMS.FRAMING_M_PER_WINDOW; // окна × 8
    case "pilyastra":
      return corners * NORMS.PILASTER_M_PER_CORNER; // углы × 3
    case "karniz":
      return perimeter; // периметр
  }
}

// Входные параметры калькулятора
export interface CalcInputs {
  area: number; // площадь фасада, м²
  windows: number; // количество окон, шт
  corners: number; // количество углов, шт
  perimeter: number; // периметр фундамента, м
}

// Цены — редактируемые в UI ("Настройка цен")
export interface Prices {
  panel: number; // термопанель, тг/м² (зафиксирована = 3200)
  gluePerBag: number; // клей, тг/мешок
  travertinePerBucket: number; // травертин, тг/ведро
  lacquerPerCan: number; // лак, тг/банка (10кг)
  framingPerMeter: number; // обрамление, тг/м
  cornerPerUnit: number; // углы, тг/угол
  foundationPerMeter: number; // фундамент, тг/м
  foundationPaintPerLiter: number; // краска цоколя, тг/л
}

export const DEFAULT_PRICES: Prices = {
  panel: 3200,
  gluePerBag: 4500,
  travertinePerBucket: 9000,
  lacquerPerCan: 22000,
  framingPerMeter: 2500,
  cornerPerUnit: 3500,
  foundationPerMeter: 4000,
  foundationPaintPerLiter: 3000,
};

export interface LineItem {
  key: string;
  name: string;
  detail: string; // расход / количество с единицами
  unitLabel: string; // подпись цены за единицу
  unitPrice: number;
  total: number;
  bonus?: boolean;
}

export interface Estimate {
  items: LineItem[];
  total: number;
  pricePerM2: number;
}

const ceil = (n: number) => Math.ceil(n);
const round = (n: number) => Math.round(n);

export function calculate(
  inputs: CalcInputs,
  prices: Prices,
  foundationId?: string | null,
  decorIds?: string[]
): Estimate {
  const area = Math.max(0, inputs.area || 0);
  const windows = Math.max(0, inputs.windows || 0);
  const corners = Math.max(0, inputs.corners || 0);
  const perimeter = Math.max(0, inputs.perimeter || 0);

  const items: LineItem[] = [];

  // 1. Термопанель = area × 3200
  items.push({
    key: "panel",
    name: "Термопанель",
    detail: `${fmtNum(area)} м²`,
    unitLabel: "тг/м²",
    unitPrice: prices.panel,
    total: round(area * prices.panel),
  });

  // 2. Клей = ceil(area / 8) мешков
  const glueBags = ceil(area / NORMS.GLUE_M2_PER_BAG);
  items.push({
    key: "glue",
    name: "Клей (25 кг)",
    detail: `${glueBags} ${plural(glueBags, "мешок", "мешка", "мешков")}`,
    unitLabel: "тг/мешок",
    unitPrice: prices.gluePerBag,
    total: glueBags * prices.gluePerBag,
  });

  // 3. Травертин = ceil(area / 10) вёдер
  const travBuckets = ceil(area / NORMS.TRAVERTINE_M2_PER_BUCKET);
  items.push({
    key: "travertine",
    name: "Травертин (20 кг / ведро)",
    detail: `${travBuckets} ${plural(travBuckets, "ведро", "ведра", "вёдер")}`,
    unitLabel: "тг/ведро",
    unitPrice: prices.travertinePerBucket,
    total: travBuckets * prices.travertinePerBucket,
  });

  // 4. Лак = area/66 × 10 кг; ceil(area/66) банок по 10кг
  const lacquerCans = ceil(area / NORMS.LACQUER_M2_PER_CAN);
  const lacquerKg = round((area / NORMS.LACQUER_M2_PER_CAN) * NORMS.LACQUER_KG_PER_CAN);
  items.push({
    key: "lacquer",
    name: "Лак (10 кг / банка)",
    detail: `${lacquerCans} ${plural(lacquerCans, "банка", "банки", "банок")} · ≈${fmtNum(lacquerKg)} кг`,
    unitLabel: "тг/банка",
    unitPrice: prices.lacquerPerCan,
    total: lacquerCans * prices.lacquerPerCan,
  });

  // 5. Обрамление = окна × 8 м (БАЗОВАЯ строка — остаётся всегда)
  const framingMeters = windows * NORMS.FRAMING_M_PER_WINDOW;
  items.push({
    key: "framing",
    name: "Обрамление окон",
    detail: `${fmtNum(framingMeters)} м (${windows} ${plural(windows, "окно", "окна", "окон")})`,
    unitLabel: "тг/м",
    unitPrice: prices.framingPerMeter,
    total: round(framingMeters * prices.framingPerMeter),
  });

  // 5.1 Декор (мультивыбор) — отдельная строка за каждый выбранный элемент.
  //     Пока каталог пуст / ничего не выбрано → строк нет, смета не меняется.
  for (const id of decorIds ?? []) {
    const decor = getDecor(id);
    if (!decor) continue;
    const meters = decorMeters(decor.category, windows, corners, perimeter);
    items.push({
      key: `decor-${decor.id}`,
      name: decor.name,
      detail: `${fmtNum(meters)} м`,
      unitLabel: "тг/м",
      unitPrice: decor.pricePerM,
      total: round(meters * decor.pricePerM),
    });
  }

  // 6. Углы = кол-во углов
  items.push({
    key: "corners",
    name: "Углы",
    detail: `${corners} ${plural(corners, "угол", "угла", "углов")}`,
    unitLabel: "тг/угол",
    unitPrice: prices.cornerPerUnit,
    total: corners * prices.cornerPerUnit,
  });

  // 7. Фундамент = периметр × цена/метр.
  //    Выбран цоколь из каталога → его имя и цена; иначе — прежнее поведение.
  const foundation = getFoundation(foundationId);
  items.push({
    key: "foundation",
    name: foundation ? `Цоколь: ${foundation.name}` : "Фундамент (отделка)",
    detail: `${fmtNum(perimeter)} м`,
    unitLabel: "тг/м",
    unitPrice: foundation ? foundation.pricePerM : prices.foundationPerMeter,
    total: round(
      perimeter * (foundation ? foundation.pricePerM : prices.foundationPerMeter)
    ),
  });

  // 8. Краска (фундамент) = (периметр × 0.4) ÷ 10 = литров
  const paintLiters = (perimeter * NORMS.FOUNDATION_PAINT_HEIGHT) / NORMS.PAINT_L_PER_UNIT;
  items.push({
    key: "foundationPaint",
    name: "Краска для цоколя",
    detail: `${fmtNum(roundTo(paintLiters, 2))} л`,
    unitLabel: "тг/л",
    unitPrice: prices.foundationPaintPerLiter,
    total: round(paintLiters * prices.foundationPaintPerLiter),
  });

  // 9. Затирка = 🎁 БОНУС, бесплатно
  items.push({
    key: "grout",
    name: "Затирка",
    detail: "В подарок",
    unitLabel: "",
    unitPrice: 0,
    total: 0,
    bonus: true,
  });

  const total = items.reduce((sum, it) => sum + it.total, 0);
  const pricePerM2 = area > 0 ? round(total / area) : 0;

  return { items, total, pricePerM2 };
}

// ── Форматирование ──
export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}

function roundTo(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

// Русские склонения
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
