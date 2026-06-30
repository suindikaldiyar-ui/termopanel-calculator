"use client";

import { useMemo, useState } from "react";
import {
  calculate,
  DEFAULT_PRICES,
  type CalcInputs,
  type Prices,
} from "@/lib/calc";
import ParamsPanel from "@/components/ParamsPanel";
import EstimatePanel from "@/components/EstimatePanel";
import Visualizer from "@/components/Visualizer";

const INITIAL_INPUTS: CalcInputs = {
  area: 120,
  windows: 8,
  corners: 4,
  perimeter: 44,
};

export default function Page() {
  const [inputs, setInputs] = useState<CalcInputs>(INITIAL_INPUTS);
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);

  const estimate = useMemo(() => calculate(inputs, prices), [inputs, prices]);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-stone text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta text-lg font-black">
              Т
            </span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight tracking-tight">
                Термопанель
              </h1>
              <p className="text-xs text-white/50">
                Калькулятор фасада · AI-визуализация
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 sm:block">
            Травертин · фасадные термопанели
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        {/* 2 колонки: Параметры | Смета */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ParamsPanel
            inputs={inputs}
            onInputs={setInputs}
            prices={prices}
            onPrices={setPrices}
            onResetPrices={() => setPrices(DEFAULT_PRICES)}
          />
          <EstimatePanel estimate={estimate} area={inputs.area} />
        </div>

        {/* Полноширинная AI-визуализация */}
        <Visualizer />

        <footer className="pb-6 pt-2 text-center text-xs text-ink/30">
          Pitch-MVP · расчёт ориентировочный, уточняется при замере
        </footer>
      </div>
    </main>
  );
}
