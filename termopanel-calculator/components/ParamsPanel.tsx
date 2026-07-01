"use client";

import type { CalcInputs, Prices } from "@/lib/calc";
import PriceSettings from "./PriceSettings";

interface Props {
  inputs: CalcInputs;
  onInputs: (next: CalcInputs) => void;
  prices: Prices;
  onPrices: (next: Prices) => void;
  onResetPrices: () => void;
}

const NUM_FIELDS: {
  key: keyof CalcInputs;
  label: string;
  suffix: string;
  step?: number;
  hint?: string;
}[] = [
  { key: "length", label: "Длина дома", suffix: "м", step: 0.1 },
  { key: "width", label: "Ширина дома", suffix: "м", step: 0.1 },
  { key: "wallHeight", label: "Высота стен", suffix: "м", step: 0.1 },
  { key: "windowsArea", label: "Площадь окон, всего", suffix: "м²", step: 0.1 },
  {
    key: "foundationHeight",
    label: "Высота фундамента",
    suffix: "м",
    step: 0.05,
    hint: "утепление 3 см",
  },
  { key: "corners", label: "Количество углов", suffix: "шт", step: 1 },
  { key: "windows", label: "Количество окон", suffix: "шт", step: 1 },
];

export default function ParamsPanel({
  inputs,
  onInputs,
  prices,
  onPrices,
  onResetPrices,
}: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold text-ink">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-gold to-goldLight" />
        Параметры объекта
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NUM_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">
              {f.label}
              {f.hint && (
                <span className="ml-1 text-xs text-gold">· {f.hint}</span>
              )}
            </span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={f.step}
                value={
                  Number.isFinite(inputs[f.key]) && inputs[f.key] !== 0
                    ? inputs[f.key]
                    : ""
                }
                placeholder="0"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onInputs({ ...inputs, [f.key]: Number.isFinite(n) ? n : 0 });
                }}
                className="tnum w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 pr-12 text-base font-semibold text-ink outline-none transition placeholder:text-muted/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                {f.suffix}
              </span>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4">
        <PriceSettings prices={prices} onChange={onPrices} onReset={onResetPrices} />
      </div>
    </div>
  );
}
