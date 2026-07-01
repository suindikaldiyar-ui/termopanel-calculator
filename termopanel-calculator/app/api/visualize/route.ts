import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { TEXTURES } from "@/lib/textures";
import { getFoundation } from "@/lib/foundations";
import { getDecor, type DecorItem } from "@/lib/decor";
import { getFrame } from "@/lib/frames";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

interface Body {
  image?: string; // фото дома, base64 (без префикса data:)
  mimeType?: string; // напр. image/jpeg
  textureId?: string; // id выбранной текстуры
  foundationId?: string | null; // id отделки цоколя (null = без цоколя)
  decorIds?: string[]; // id выбранного декора (мультивыбор)
  frameId?: string | null; // id обрамления окон (null = без обрамления)
  withBrackets?: boolean; // кронштейны: true = с, false = без, undefined = без указания
  comment?: string; // доп. комментарий пользователя
}

type ImageAsset = { data: string; mimeType: string; bytes: number };

// 1) Приоритет: читаем картинку-референс с диска (благодаря outputFileTracingIncludes
//    файлы попадают в serverless-бандл на Vercel). folder — папка в public/.
function loadAssetFromDisk(folder: string, id: string): ImageAsset | null {
  try {
    const filePath = join(process.cwd(), "public", folder, `${id}.jpg`);
    const buf = readFileSync(filePath);
    console.log(`${folder} loaded (disk): ${id}, ${buf.length} bytes`);
    return { data: buf.toString("base64"), mimeType: "image/jpeg", bytes: buf.length };
  } catch {
    return null; // файла нет в бандле
  }
}

// 2) Подстраховка: если файла нет в бандле — тянем по публичному URL.
async function loadAssetFromUrl(
  folder: string,
  id: string,
  origin: string | null
): Promise<ImageAsset | null> {
  if (!origin) return null;
  try {
    const res = await fetch(`${origin}/${folder}/${id}.jpg`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`${folder} loaded (url): ${id}, ${buf.length} bytes`);
    return { data: buf.toString("base64"), mimeType: "image/jpeg", bytes: buf.length };
  } catch {
    return null;
  }
}

// Определяем публичный origin запроса (для фолбэка)
function getOrigin(req: NextRequest): string | null {
  const host = req.headers.get("host");
  if (!host) return null;
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Не настроен GEMINI_API_KEY. Добавьте ключ в .env.local." },
      { status: 500 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const { image, textureId, foundationId, decorIds, frameId, withBrackets, comment } = body;
  const mimeType = body.mimeType || "image/jpeg";

  if (!image) {
    return NextResponse.json(
      { error: "Не передано изображение дома." },
      { status: 400 }
    );
  }

  // Текстура обязательна и должна быть из каталога (защита от path traversal)
  const textureMeta = TEXTURES.find((t) => t.id === textureId);
  if (!textureId || !textureMeta) {
    return NextResponse.json(
      { error: "Не выбрана текстура травертина." },
      { status: 400 }
    );
  }

  // Образец: сначала с диска, при неудаче — фолбэк по публичному URL.
  // Нет ни там, ни там → НЕ подменяем описанием, а сразу ошибка.
  let texture = loadAssetFromDisk("textures", textureId);
  if (!texture) {
    texture = await loadAssetFromUrl("textures", textureId, getOrigin(req));
  }
  if (!texture) {
    return NextResponse.json(
      { error: `Текстура ${textureId} не найдена в public/textures/` },
      { status: 400 }
    );
  }

  const foundation = getFoundation(foundationId);
  const decors = (decorIds ?? [])
    .map(getDecor)
    .filter((d): d is DecorItem => Boolean(d));

  // Обрамление окон — необязательный ТРЕТИЙ референс. Нет файла → работаем по hint.
  const frame = getFrame(frameId);
  let frameAsset: ImageAsset | null = null;
  if (frame) {
    frameAsset = loadAssetFromDisk("frames", frame.id);
    if (!frameAsset) {
      frameAsset = await loadAssetFromUrl("frames", frame.id, getOrigin(req));
    }
  }

  const userComment = (comment || "").trim();

  // Строгий промпт: цвет и рисунок берём СТРОГО из IMAGE 2.
  let prompt =
    `Facade visualization with a reference material.\n` +
    `IMAGE 1 = the house. IMAGE 2 = the exact travertine stone sample to use.\n\n` +
    `Apply the travertine from IMAGE 2 onto all plaster walls of the house in IMAGE 1.\n` +
    `CRITICAL: use the precise color, tone, veining and stone pattern from IMAGE 2 — ` +
    `do NOT invent a different travertine, do NOT change its color or shade.\n` +
    `Match the IMAGE 2 material exactly, only adapting its scale realistically to the walls.\n` +
    `Use IMAGE 2 strictly as a material/color reference for the walls. Do NOT paste IMAGE 2 ` +
    `as a picture, poster, sign or framed sample anywhere in the scene.\n\n` +
    `Keep strictly unchanged: building shape, all windows and window frames, doors, ` +
    `the veranda/porch structure, railings, stairs, roof, sky, ground, plants and ` +
    `background. Same camera angle. Photorealistic, natural daylight, high quality.`;

  // Цоколь — разрешённое добавление (только если выбран)
  if (foundation?.hint) {
    prompt +=
      `\n\nAlso clad the base/plinth (about 0.4-0.5 m high) along the bottom of the ` +
      `walls in ${foundation.hint}, with a crisp clean top edge. This plinth is an intended addition.`;
  }

  // Декор — разрешённое добавление (мультивыбор)
  if (decors.length) {
    prompt +=
      `\n\nAdd these facade decorative elements: ${decors.map((d) => d.hint).join(", ")}. ` +
      `Render them realistically at natural scale.`;
  }

  // Обрамление окон — по фото-референсу (IMAGE 3) или по тексту (fallback).
  if (frame && frameAsset) {
    prompt +=
      `\n\nAdd the same window trim as shown in IMAGE 3 around every window. The trim ` +
      `color MUST be ${frame.color} — do NOT make it white if the reference is dark. ` +
      `Replicate the EXACT profile, shape and COLOR from IMAGE 3. IMPORTANT: ignore ` +
      `the window glass, curtains and interior visible in IMAGE 3 — copy ONLY the ` +
      `decorative trim frame (surround, pilasters, cornice, sill), not the glass or ` +
      `what is behind it. Keep the house's own windows and glass from IMAGE 1 unchanged.`;
  } else if (frame) {
    prompt +=
      `\n\nAdd decorative window trim around EVERY window of the house: ${frame.hint}. ` +
      `Keep it white/cream, realistic scale. Only add the frame around each window — ` +
      `do not cover or change the window glass.`;
  }

  // Кронштейны — две версии рендера (для сравнения)
  if (withBrackets === false) {
    prompt +=
      `\n\nDo NOT add any brackets, corbels or decorative console elements to the facade. ` +
      `Keep the facade clean without support brackets.`;
  } else if (withBrackets === true) {
    prompt +=
      `\n\nAdd small decorative corbels (brackets) at the TOP CORNERS of each WINDOW's ` +
      `trim — where the side pilasters meet the top cornice of the window frame, on the ` +
      `left and right side of every window. These brackets support the window's top ` +
      `cornice. Do NOT place any brackets under the roof, on the roofline, on the walls ` +
      `or at the building corners — ONLY at the upper sides of the window frames. ` +
      `Small, symmetric, ornamental, matching the classic trim style, natural scale.`;
  }

  // Доп. инструкции пользователя
  if (userComment) {
    prompt += `\n\nAdditional user instructions (follow them): ${userComment}`;
  }

  // contents.parts = [ {text}, IMAGE1=дом, IMAGE2=текстура_стен, IMAGE3=обрамление? ]
  const parts: any[] = [
    { text: prompt },
    { inline_data: { mime_type: mimeType, data: image } }, // IMAGE 1 — дом
    { inline_data: { mime_type: texture.mimeType, data: texture.data } }, // IMAGE 2 — материал стен
  ];
  if (frameAsset) {
    // IMAGE 3 — референс обрамления окон
    parts.push({ inline_data: { mime_type: frameAsset.mimeType, data: frameAsset.data } });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Gemini error:", res.status, text);
      let msg = "Ошибка генерации. Попробуйте ещё раз.";
      if (res.status === 400) msg = "Запрос отклонён моделью. Проверьте фото и попробуйте снова.";
      if (res.status === 401 || res.status === 403) msg = "Неверный или недействительный API-ключ Gemini.";
      if (res.status === 413) msg = "Изображение слишком большое. Загрузите фото меньшего размера.";
      if (res.status === 429) msg = "Превышен лимит запросов. Подождите немного и попробуйте снова.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await res.json();
    const parts: any[] =
      data?.candidates?.[0]?.content?.parts ?? [];

    const imagePart = parts.find(
      (p) => p?.inline_data?.data || p?.inlineData?.data
    );
    const outData =
      imagePart?.inline_data?.data || imagePart?.inlineData?.data || null;
    const outMime =
      imagePart?.inline_data?.mime_type ||
      imagePart?.inlineData?.mimeType ||
      "image/png";

    if (!outData) {
      // Модель могла вернуть только текст (отказ / описание)
      const textPart = parts.find((p) => p?.text)?.text;
      console.error("Gemini вернул без изображения:", textPart);
      return NextResponse.json(
        {
          error:
            "Модель не вернула изображение. Попробуйте другое фото или цвет.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      image: outData,
      mimeType: outMime,
      texture: textureMeta?.name ?? null,
      usedReference: Boolean(texture),
    });
  } catch (err) {
    console.error("Visualize fatal:", err);
    return NextResponse.json(
      { error: "Сервис визуализации недоступен. Попробуйте позже." },
      { status: 500 }
    );
  }
}
