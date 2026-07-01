"use client";

import { useEffect, useState } from "react";
import type { Estimate } from "@/lib/calc";
import { fmtMoney } from "@/lib/calc";

interface Props {
  estimate: Estimate;
  area: number;
}

export default function EstimatePanel({ estimate, area }: Props) {
  const handlePrint = () => window.print();

  // Дата вычисляется на клиенте (без hydration mismatch)
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("ru-RU"));
  }, []);

  return (
    <div className="print-block flex h-full flex-col rounded-2xl border border-line bg-surface shadow-card">
      {/* Печатная шапка с логотипом — видна только при печати */}
      <div className="print-only mb-4 border-b border-line pb-4 text-center">
        <img
          src="/logo.png"
          alt="Логотип компании"
          className="mx-auto h-[60px] w-auto object-contain"
        />
        <div className="mt-3 text-lg font-bold">Коммерческое предложение</div>
        {today && <div className="mt-0.5 text-sm">от {today}</div>}
      </div>

      {/* Заголовок + золотая линия */}
      <div className="px-5 pt-5 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-ink">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-gold to-goldLight" />
            Смета
          </h2>
          <button
            type="button"
            onClick={handlePrint}
            className="no-print inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gold to-goldLight px-3.5 py-1.5 text-xs font-bold text-stone transition hover:brightness-110"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Сохранить / печать
          </button>
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-gold/70 via-gold/25 to-transparent" />
      </div>

      {/* Строки сметы */}
      <div className="flex-1 divide-y divide-line px-5 sm:px-6">
        {estimate.items.map((it) => (
          <div key={it.key} className="flex items-baseline justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{it.name}</span>
                {it.bonus && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-bonus/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bonus">
                    🎁 Бонус
                  </span>
                )}
              </div>
              <div className="tnum mt-0.5 text-xs text-muted">
                {it.detail}
                {!it.bonus && it.unitPrice > 0 && (
                  <span>
                    {" · "}
                    {fmtMoney(it.unitPrice)} {it.unitLabel}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`tnum shrink-0 text-base font-bold ${
                it.bonus ? "text-bonus" : "text-goldLight"
              }`}
            >
              {it.bonus ? "0 ₸" : fmtMoney(it.total)}
            </div>
          </div>
        ))}
      </div>

      {/* ИТОГО — золотой градиент, тёмный текст */}
      <div className="print-total m-3 rounded-xl bg-gradient-to-br from-gold to-goldLight px-5 py-4 text-stone shadow-gold">
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold uppercase tracking-wide text-stone/70">
            Итого
          </span>
          <span className="tnum text-3xl font-extrabold leading-none tracking-tight sm:text-4xl">
            {fmtMoney(estimate.total)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-stone/20 pt-2.5">
          <span className="text-xs font-medium text-stone/60">
            Цена за 1 м² фасада
          </span>
          <span className="tnum text-sm font-bold text-stone">
            {area > 0 ? fmtMoney(estimate.pricePerM2) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
