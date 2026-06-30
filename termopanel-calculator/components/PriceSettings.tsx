"use client";

import { useState } from "react";
import type { Prices } from "@/lib/calc";

interface Props {
  prices: Prices;
  onChange: (next: Prices) => void;
  onReset: () => void;
}

const FIELDS: { key: keyof Prices; label: string; suffix: string; locked?: boolean }[] = [
  { key: "panel", label: "Термопанель", suffix: "тг/м²", locked: true },
  { key: "gluePerBag", label: "Клей", suffix: "тг/мешок" },
  { key: "travertinePerBucket", label: "Травертин", suffix: "тг/ведро" },
  { key: "lacquerPerCan", label: "Лак", suffix: "тг/банка" },
  { key: "framingPerMeter", label: "Обрамление", suffix: "тг/м" },
  { key: "cornerPerUnit", label: "Углы", suffix: "тг/угол" },
  { key: "foundationPerMeter", label: "Фундамент", suffix: "тг/м" },
  { key: "foundationPaintPerLiter", label: "Краска цоколя", suffix: "тг/л" },
];

export default function PriceSettings({ prices, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-canvas/60 no-print">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-terracotta">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          Настройка цен
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-ink/50 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-line px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink/60">
                  {f.label}
                  {f.locked && <span className="ml-1 text-terracotta">· фикс.</span>}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={prices[f.key]}
                    disabled={f.locked}
                    onChange={(e) =>
                      onChange({ ...prices, [f.key]: Number(e.target.value) })
                    }
                    className="tnum w-full rounded-lg border border-line bg-surface px-3 py-2 pr-14 text-sm text-ink outline-none focus:border-terracotta disabled:bg-canvas disabled:text-ink/50"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink/40">
                    {f.suffix}
                  </span>
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 text-xs font-medium text-terracotta hover:underline"
          >
            Сбросить к значениям по умолчанию
          </button>
        </div>
      )}
    </div>
  );
}
