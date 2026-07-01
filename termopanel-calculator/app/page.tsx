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
import ClientKP from "@/components/ClientKP";
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

  // Один общий выбор для сметы И визуализатора
  const [foundationId, setFoundationId] = useState<string | null>(null);
  const [decorIds, setDecorIds] = useState<string[]>([]);

  const estimate = useMemo(
    () => calculate(inputs, prices, foundationId, decorIds),
    [inputs, prices, foundationId, decorIds]
  );

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-line bg-stone text-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            {/* Логотип на белом фоне вписан в светлую плашку */}
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-[#F2EDE3] p-2 shadow-gold">
              <img
                src="/logo.png"
                alt="Логотип компании"
                className="h-9 w-auto object-contain sm:h-11"
              />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold leading-tight tracking-tight">
                Термопанель
              </h1>
              <p className="truncate text-xs text-muted">
                Калькулятор фасада · AI-визуализация
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-gold/40 px-3 py-1 text-xs text-gold sm:block">
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

        {/* Данные клиента + отправка КП в WhatsApp */}
        <ClientKP estimate={estimate} area={inputs.area} />

        {/* Полноширинная AI-визуализация */}
        <Visualizer
          foundationId={foundationId}
          decorIds={decorIds}
          onFoundationId={setFoundationId}
          onDecorIds={setDecorIds}
        />

        <footer className="pb-6 pt-2 text-center text-xs text-muted/60">
          Pitch-MVP · расчёт ориентировочный, уточняется при замере
        </footer>
      </div>
    </main>
  );
}
