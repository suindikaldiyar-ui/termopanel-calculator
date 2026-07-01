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
} as const;

// Входные параметры калькулятора
export interface CalcInputs {
  length: number; // длина дома, м
  width: number; // ширина дома, м
  wallHeight: number; // высота стен, м
  windowsArea: number; // площадь окон, всего, м² (вычитается из стен)
  foundationHeight: number; // высота фундамента, м (утепление 3 см)
  corners: number; // количество углов, шт
  windows: number; // количество окон, шт (для обрамления)
}

// Цены — редактируемые в UI ("Настройка цен")
export interface Prices {
  termopanelPricePerM2: number; // термопанель, тг/м² (дефолт 3200)
  gluePerBag: number; // клей, тг/мешок
  travertinePerBucket: number; // травертин, тг/ведро
  lacquerPerCan: number; // лак, тг/банка (10кг)
  framingPerMeter: number; // обрамление, тг/м
  cornerPerUnit: number; // углы, тг/угол
  foundationMaterialPerM2: number; // фундамент: материал, тг/м²
  foundationPaintPerM2: number; // фундамент: краска, тг/м²
}

export const DEFAULT_PRICES: Prices = {
  termopanelPricePerM2: 3200,
  gluePerBag: 4500,
  travertinePerBucket: 9000,
  lacquerPerCan: 22000,
  framingPerMeter: 2500,
  cornerPerUnit: 3500,
  foundationMaterialPerM2: 3800,
  foundationPaintPerM2: 1500,
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
  // Площади (для отображения и КП)
  panelArea: number; // чистая площадь термопанели (стены − окна)
  foundationArea: number; // площадь фундамента
  totalArea: number; // общая площадь = panelArea + foundationArea
  perimeter: number; // периметр, м
  wallArea: number; // площадь стен (до вычета окон)
}

const ceil = (n: number) => Math.ceil(n);
const round = (n: number) => Math.round(n);

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

export function calculate(
  inputs: CalcInputs,
  prices: Prices,
  foundationId?: string | null,
  decorIds?: string[]
): Estimate {
  const length = Math.max(0, inputs.length || 0);
  const width = Math.max(0, inputs.width || 0);
  const wallHeight = Math.max(0, inputs.wallHeight || 0);
  const windowsArea = Math.max(0, inputs.windowsArea || 0);
  const foundationHeight = Math.max(0, inputs.foundationHeight || 0);
  const corners = Math.max(0, inputs.corners || 0);
  const windows = Math.max(0, inputs.windows || 0);

  // Авто-расчёт площадей
  const perimeter = (length + width) * 2;
  const wallArea = perimeter * wallHeight;
  const panelArea = Math.max(0, wallArea - windowsArea);
  const foundationArea = perimeter * foundationHeight;
  const totalArea = panelArea + foundationArea;

  const items: LineItem[] = [];

  // 1. Термопанель = panelArea × цена (чистая площадь: стены − окна)
  items.push({
    key: "panel",
    name: "Термопанель",
    detail: `${fmtNum(panelArea)} м² (стены ${fmtNum(wallArea)} − окна ${fmtNum(windowsArea)})`,
    unitLabel: "тг/м²",
    unitPrice: prices.termopanelPricePerM2,
    total: round(panelArea * prices.termopanelPricePerM2),
  });

  // 2. Клей = ceil(panelArea / 8) мешков
  const glueBags = ceil(panelArea / NORMS.GLUE_M2_PER_BAG);
  items.push({
    key: "glue",
    name: "Клей (25 кг)",
    detail: `${glueBags} ${plural(glueBags, "мешок", "мешка", "мешков")}`,
    unitLabel: "тг/мешок",
    unitPrice: prices.gluePerBag,
    total: glueBags * prices.gluePerBag,
  });

  // 3. Травертин = ceil(panelArea / 10) вёдер
  const travBuckets = ceil(panelArea / NORMS.TRAVERTINE_M2_PER_BUCKET);
  items.push({
    key: "travertine",
    name: "Травертин (20 кг / ведро)",
    detail: `${travBuckets} ${plural(travBuckets, "ведро", "ведра", "вёдер")}`,
    unitLabel: "тг/ведро",
    unitPrice: prices.travertinePerBucket,
    total: travBuckets * prices.travertinePerBucket,
  });

  // 4. Лак = ceil(panelArea / 66) банок по 10кг
  const lacquerCans = ceil(panelArea / NORMS.LACQUER_M2_PER_CAN);
  const lacquerKg = round((panelArea / NORMS.LACQUER_M2_PER_CAN) * NORMS.LACQUER_KG_PER_CAN);
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

  // 7. Фундамент = foundationArea × (материал + краска).
  //    Выбран цоколь из каталога → отдельная логика (цена за пог. метр).
  const foundation = getFoundation(foundationId);
  if (foundation) {
    items.push({
      key: "foundation",
      name: `Цоколь: ${foundation.name}`,
      detail: `${fmtNum(perimeter)} м`,
      unitLabel: "тг/м",
      unitPrice: foundation.pricePerM,
      total: round(perimeter * foundation.pricePerM),
    });
  } else {
    const foundationPerM2 =
      prices.foundationMaterialPerM2 + prices.foundationPaintPerM2;
    items.push({
      key: "foundation",
      name: "Фундамент",
      detail:
        `${fmtNum(foundationArea)} м² (${fmtNum(perimeter)} м × ${fmtNum(foundationHeight)} м) · ` +
        `(${fmtNum(prices.foundationMaterialPerM2)} + ${fmtNum(prices.foundationPaintPerM2)}) тг/м²`,
      unitLabel: "тг/м²",
      unitPrice: foundationPerM2,
      total: round(foundationArea * foundationPerM2),
    });
  }

  // 8. Затирка = 🎁 БОНУС, бесплатно
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
  const pricePerM2 = totalArea > 0 ? round(total / totalArea) : 0;

  return {
    items,
    total,
    pricePerM2,
    panelArea,
    foundationArea,
    totalArea,
    perimeter,
    wallArea,
  };
}

// ── Форматирование ──
export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}

// Русские склонения
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
