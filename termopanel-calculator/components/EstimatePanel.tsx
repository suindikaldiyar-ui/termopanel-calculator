"use client";

import type { Estimate } from "@/lib/calc";
import { fmtMoney } from "@/lib/calc";

interface Props {
  estimate: Estimate;
  area: number;
}

export default function EstimatePanel({ estimate, area }: Props) {
  const handlePrint = () => window.print();

  return (
    <div className="print-block flex h-full flex-col rounded-2xl bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-bold text-ink">Смета</h2>
        <button
          type="button"
          onClick={handlePrint}
          className="no-print inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-terracotta hover:text-terracotta"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          Сохранить / печать
        </button>
      </div>

      <div className="flex-1 divide-y divide-line px-5">
        {estimate.items.map((it) => (
          <div key={it.key} className="flex items-baseline justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{it.name}</span>
                {it.bonus && (
                  <span className="rounded-full bg-bonus/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bonus">
                    🎁 Бонус
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-ink/50">
                {it.detail}
                {!it.bonus && it.unitPrice > 0 && (
                  <span className="tnum">
                    {" · "}
                    {fmtMoney(it.unitPrice)} {it.unitLabel}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`tnum shrink-0 text-sm font-semibold ${
                it.bonus ? "text-bonus" : "text-ink"
              }`}
            >
              {it.bonus ? "0 ₸" : fmtMoney(it.total)}
            </div>
          </div>
        ))}
      </div>

      {/* ИТОГО — на тёмном фоне stone, крупно */}
      <div className="m-3 rounded-xl bg-stone px-5 py-4 text-white">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-white/70">Итого</span>
          <span className="tnum text-2xl font-extrabold tracking-tight">
            {fmtMoney(estimate.total)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2">
          <span className="text-xs text-white/50">Цена за 1 м² фасада</span>
          <span className="tnum text-sm font-semibold text-terracotta">
            {area > 0 ? fmtMoney(estimate.pricePerM2) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
