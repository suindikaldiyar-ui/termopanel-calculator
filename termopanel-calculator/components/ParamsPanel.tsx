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

const NUM_FIELDS: { key: keyof CalcInputs; label: string; suffix: string; step?: number }[] = [
  { key: "area", label: "Площадь фасада", suffix: "м²", step: 1 },
  { key: "windows", label: "Количество окон", suffix: "шт", step: 1 },
  { key: "corners", label: "Количество углов", suffix: "шт", step: 1 },
  { key: "perimeter", label: "Периметр фундамента", suffix: "м", step: 1 },
];

export default function ParamsPanel({
  inputs,
  onInputs,
  prices,
  onPrices,
  onResetPrices,
}: Props) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-base font-bold text-ink">Параметры объекта</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NUM_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink/70">{f.label}</span>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={f.step}
                value={inputs[f.key] === 0 ? "" : inputs[f.key]}
                placeholder="0"
                onChange={(e) =>
                  onInputs({ ...inputs, [f.key]: Number(e.target.value) || 0 })
                }
                className="tnum w-full rounded-xl border border-line bg-canvas/50 px-3.5 py-2.5 pr-12 text-base font-semibold text-ink outline-none transition focus:border-terracotta focus:bg-surface"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink/40">
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
