"use client";

import { useRef, useState } from "react";
import { TEXTURES, type Texture } from "@/lib/textures";
import { FOUNDATIONS, type Foundation } from "@/lib/foundations";
import { compressImage, type CompressedImage } from "@/lib/image";

export default function Visualizer() {
  const [source, setSource] = useState<CompressedImage | null>(null);
  const [texture, setTexture] = useState<Texture>(TEXTURES[0]);
  const [foundation, setFoundation] = useState<Foundation>(FOUNDATIONS[0]);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<string | null>(null); // data url «ПОСЛЕ»
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null); // data url «ДО»
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [failedTextures, setFailedTextures] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Пожалуйста, загрузите изображение.");
      return;
    }
    setError(null);
    setResult(null);
    try {
      const compressed = await compressImage(file);
      setSource(compressed);
    } catch (e: any) {
      setError(e?.message || "Не удалось обработать изображение.");
    }
  }

  async function generate() {
    if (!source) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: source.base64,
          mimeType: source.mimeType,
          textureId: texture.id,
          foundationId: foundation.id,
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Ошибка генерации.");
      }
      setBeforeUrl(source.dataUrl); // фиксируем «ДО» на момент генерации
      setResult(`data:${data.mimeType || "image/png"};base64,${data.image}`);
    } catch (e: any) {
      setError(e?.message || "Не удалось сгенерировать визуализацию.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `termopanel-${texture.id}.png`;
    a.click();
  }

  // Загрузка картинки из data url в HTMLImageElement
  function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Не удалось загрузить изображение."));
      img.src = src;
    });
  }

  // Склейка ДО/ПОСЛЕ в одну картинку через canvas
  async function downloadBoth() {
    if (!beforeUrl || !result) return;
    try {
      const [before, after] = await Promise.all([
        loadImg(beforeUrl),
        loadImg(result),
      ]);

      const H = 800; // общая высота
      const GAP = 6; // белая полоса-разделитель
      const wBefore = Math.round((before.width / before.height) * H);
      const wAfter = Math.round((after.width / after.height) * H);
      const W = wBefore + GAP + wAfter;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // фон-разделитель
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      ctx.drawImage(before, 0, 0, wBefore, H);
      ctx.drawImage(after, wBefore + GAP, 0, wAfter, H);

      // подписи внизу
      drawLabel(ctx, "ДО", 0, H);
      drawLabel(ctx, "ПОСЛЕ", wBefore + GAP, H);

      const url = canvas.toDataURL("image/jpeg", 0.9);
      const a = document.createElement("a");
      a.href = url;
      a.download = "termopanel-do-posle.jpg";
      a.click();
    } catch (e: any) {
      setError(e?.message || "Не удалось собрать изображение ДО/ПОСЛЕ.");
    }
  }

  // Плашка с подписью в левом нижнем углу панели, начинающейся с offsetX
  function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    offsetX: number,
    H: number
  ) {
    const fontSize = 34;
    ctx.font = `700 ${fontSize}px Manrope, system-ui, sans-serif`;
    const padX = 18;
    const padY = 12;
    const tw = ctx.measureText(text).width;
    const boxW = tw + padX * 2;
    const boxH = fontSize + padY * 2;
    const x = offsetX + 20;
    const y = H - boxH - 20;

    ctx.fillStyle = "rgba(31,27,22,0.72)";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, y + boxH / 2);
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">AI-визуализация фасада</h2>
          <p className="text-sm text-ink/50">
            Загрузите фото дома и подберите цвет травертина
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Левая колонка — загрузка + палитра */}
        <div className="space-y-5">
          {/* Загрузка */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragging
                ? "border-terracotta bg-terracotta/5"
                : "border-line bg-canvas/50 hover:border-terracotta/50"
            }`}
          >
            {source ? (
              <img
                src={source.dataUrl}
                alt="Фото дома"
                className="max-h-40 rounded-lg object-contain"
              />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mb-2 text-ink/30">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m17 8-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
                <p className="text-sm font-medium text-ink">
                  Перетащите фото или нажмите
                </p>
                <p className="mt-1 text-xs text-ink/40">JPG, PNG · фасад дома</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {source && (
            <button
              type="button"
              onClick={() => {
                setSource(null);
                setResult(null);
                setError(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs font-medium text-ink/50 hover:text-terracotta"
            >
              Загрузить другое фото
            </button>
          )}

          {/* Палитра травертина */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Цвет травертина</p>
            <div className="grid grid-cols-3 gap-2">
              {TEXTURES.map((t) => {
                const active = t.id === texture.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTexture(t)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                      active
                        ? "border-terracotta ring-2 ring-terracotta/20"
                        : "border-line hover:border-terracotta/40"
                    }`}
                  >
                    {failedTextures[t.id] ? (
                      <span
                        className="h-12 w-full rounded-lg border border-black/5"
                        style={{ background: t.swatch }}
                      />
                    ) : (
                      <img
                        src={t.image}
                        alt={t.name}
                        loading="lazy"
                        onError={() =>
                          setFailedTextures((prev) => ({ ...prev, [t.id]: true }))
                        }
                        className="h-12 w-full rounded-lg border border-black/5 object-cover"
                      />
                    )}
                    <span className="text-xs font-medium text-ink">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Выбор цоколя */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Цоколь</p>
            <div className="grid grid-cols-2 gap-2">
              {FOUNDATIONS.map((f) => {
                const active = f.id === foundation.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFoundation(f)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                      active
                        ? "border-terracotta ring-2 ring-terracotta/20"
                        : "border-line hover:border-terracotta/40"
                    }`}
                  >
                    <span
                      className="h-7 w-7 shrink-0 rounded-full border border-black/10"
                      style={{ background: f.swatch }}
                    />
                    <span className="text-xs font-medium leading-tight text-ink">
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Комментарий */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Комментарий{" "}
              <span className="font-normal text-ink/40">(по желанию)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="напр.: окна сделать белыми, колонны по углам"
              className="w-full resize-none rounded-xl border border-line bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-terracotta focus:bg-surface"
            />
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!source || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-4 py-3 text-sm font-bold text-white transition hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Spinner />
                Генерация…
              </>
            ) : (
              <>✨ Визуализировать</>
            )}
          </button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Правая колонка — результат */}
        <div className="flex min-h-[280px] flex-col rounded-xl border border-line bg-canvas/40 p-3">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-ink/50">
              <Spinner large />
              <p className="text-sm">Подбираем травертин «{texture.name}»…</p>
            </div>
          ) : result ? (
            <div className="flex flex-1 flex-col">
              {/* ДО / ПОСЛЕ */}
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={beforeUrl ?? undefined}
                    alt="До"
                    className="h-full w-full rounded-lg object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    До
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={result}
                    alt="После"
                    className="h-full w-full rounded-lg object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    После
                  </span>
                </div>
              </div>

              {/* Кнопки скачивания */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={download}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-terracotta hover:text-terracotta"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  Скачать результат
                </button>
                <button
                  type="button"
                  onClick={downloadBoth}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone/90"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="7" height="14" rx="1" />
                    <rect x="14" y="5" width="7" height="14" rx="1" />
                  </svg>
                  Скачать ДО/ПОСЛЕ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-ink/40">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p className="text-sm">Здесь появится визуализация фасада</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Spinner({ large }: { large?: boolean }) {
  const size = large ? 32 : 16;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-current"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
