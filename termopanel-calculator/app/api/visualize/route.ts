import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { TEXTURES } from "@/lib/textures";
import { getFoundation } from "@/lib/foundations";
import { getDecor, type DecorItem } from "@/lib/decor";
import { getFrame } from "@/lib/frames";
import { getColumn } from "@/lib/columns";
import { getBelt } from "@/lib/belts";
import { getBracket } from "@/lib/brackets";

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
  columnId?: string | null; // id угловой колонны (null = без колонн)
  beltId?: string | null; // id межэтажного пояса (null = без пояса)
  bracketId?: string | null; // id кронштейна (null = без кронштейна)
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

  const { image, textureId, foundationId, decorIds, frameId, columnId, beltId, bracketId, comment } = body;
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

  // Цоколь — фото-референс (если есть файл), иначе fallback по hint.
  let foundationAsset: ImageAsset | null = null;
  if (foundation) {
    foundationAsset = loadAssetFromDisk("foundations", foundation.id);
    if (!foundationAsset) {
      foundationAsset = await loadAssetFromUrl("foundations", foundation.id, getOrigin(req));
    }
  }

  // Обрамление окон — фото-референс (если есть файл), иначе fallback по hint.
  const frame = getFrame(frameId);
  let frameAsset: ImageAsset | null = null;
  if (frame) {
    frameAsset = loadAssetFromDisk("frames", frame.id);
    if (!frameAsset) {
      frameAsset = await loadAssetFromUrl("frames", frame.id, getOrigin(req));
    }
  }

  // Угловые колонны — фото-референс (если есть файл), иначе fallback по hint.
  const column = getColumn(columnId);
  let columnAsset: ImageAsset | null = null;
  if (column) {
    columnAsset = loadAssetFromDisk("columns", column.id);
    if (!columnAsset) {
      columnAsset = await loadAssetFromUrl("columns", column.id, getOrigin(req));
    }
  }

  // Межэтажный пояс — фото-референс (если есть файл), иначе fallback по hint.
  const belt = getBelt(beltId);
  let beltAsset: ImageAsset | null = null;
  if (belt) {
    beltAsset = loadAssetFromDisk("belts", belt.id);
    if (!beltAsset) {
      beltAsset = await loadAssetFromUrl("belts", belt.id, getOrigin(req));
    }
  }

  // Кронштейны — фото-референс (если есть файл), иначе fallback по hint.
  const bracket = getBracket(bracketId);
  let bracketAsset: ImageAsset | null = null;
  if (bracket) {
    bracketAsset = loadAssetFromDisk("brackets", bracket.id);
    if (!bracketAsset) {
      bracketAsset = await loadAssetFromUrl("brackets", bracket.id, getOrigin(req));
    }
  }

  const userComment = (comment || "").trim();

  // Референс-картинки по порядку: IMAGE 1 = дом, IMAGE 2 = материал стен,
  // далее обрамление и цоколь (если выбраны). Номера вычисляем динамически,
  // чтобы промпт ссылался на фактическую позицию каждой картинки.
  const imageParts: any[] = [
    { inline_data: { mime_type: mimeType, data: image } }, // IMAGE 1 — дом
    { inline_data: { mime_type: texture.mimeType, data: texture.data } }, // IMAGE 2 — материал стен
  ];
  let imgCount = 2;
  let frameIndex = 0;
  let foundationIndex = 0;
  let columnIndex = 0;
  let beltIndex = 0;
  if (frameAsset) {
    frameIndex = ++imgCount; // IMAGE 3 (или далее)
    imageParts.push({ inline_data: { mime_type: frameAsset.mimeType, data: frameAsset.data } });
  }
  if (foundationAsset) {
    foundationIndex = ++imgCount; // следующий индекс после обрамления
    imageParts.push({ inline_data: { mime_type: foundationAsset.mimeType, data: foundationAsset.data } });
  }
  if (columnAsset) {
    columnIndex = ++imgCount; // после цоколя
    imageParts.push({ inline_data: { mime_type: columnAsset.mimeType, data: columnAsset.data } });
  }
  if (beltAsset) {
    beltIndex = ++imgCount; // после колонны
    imageParts.push({ inline_data: { mime_type: beltAsset.mimeType, data: beltAsset.data } });
  }
  let bracketIndex = 0;
  if (bracketAsset) {
    bracketIndex = ++imgCount; // последний референс (после пояса)
    imageParts.push({ inline_data: { mime_type: bracketAsset.mimeType, data: bracketAsset.data } });
  }

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

  // Цоколь — фото-референс (IMAGE {foundationIndex}) либо текст (fallback по hint)
  if (foundation && foundationAsset) {
    prompt +=
      `\n\nIMAGE ${foundationIndex} shows the plinth/basement panel texture. Apply this panel ` +
      `texture ONLY to the narrow plinth strip at the very bottom of the house WALLS — a ` +
      `horizontal band about 0.4-0.5 meters high directly under the wall cladding, right above ` +
      `the ground. CRITICAL: do NOT apply this texture to the ground, pavement, walkway, soil, ` +
      `tiles, stairs or any horizontal surface in front of or around the house. The plinth is ` +
      `ONLY the vertical base of the building walls. Everything below the wall base (ground, ` +
      `paving, foreground) must stay EXACTLY as in IMAGE 1, untouched. Copy only the panel ` +
      `surface from IMAGE ${foundationIndex}, ignore its background.`;
  } else if (foundation?.hint) {
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

  // Обрамление окон — по фото-референсу (IMAGE {frameIndex}) или по тексту (fallback).
  if (frame && frameAsset) {
    prompt +=
      `\n\nAdd the same window trim as shown in IMAGE ${frameIndex} around every window. The trim ` +
      `color MUST be ${frame.color} — do NOT make it white if the reference is dark. ` +
      `Replicate the EXACT profile, shape and COLOR from IMAGE ${frameIndex}. IMPORTANT: ignore ` +
      `the window glass, curtains and interior visible in IMAGE ${frameIndex} — copy ONLY the ` +
      `decorative trim frame (surround, pilasters, cornice, sill), not the glass or ` +
      `what is behind it. Keep the house's own windows and glass from IMAGE 1 unchanged.`;
  } else if (frame) {
    prompt +=
      `\n\nAdd decorative window trim around EVERY window of the house: ${frame.hint}. ` +
      `Keep it white/cream, realistic scale. Only add the frame around each window — ` +
      `do not cover or change the window glass.`;
  }

  // Угловые колонны — по фото-референсу (IMAGE {columnIndex}) или по тексту (fallback).
  if (column && columnAsset) {
    prompt +=
      `\n\nIMAGE ${columnIndex} shows a decorative corner column/pilaster. Apply this exact ` +
      `column design to the OUTER CORNERS of the house (vertical columns covering the building ` +
      `corners), matching the panels, capital and color from IMAGE ${columnIndex}. Keep the wall ` +
      `travertine and windows unchanged. Place columns ONLY on the building corners, ` +
      `not on windows. Ignore background in IMAGE ${columnIndex}, copy only the column.`;
  } else if (column) {
    prompt +=
      `\n\nAdd decorative corner columns/pilasters on the OUTER CORNERS of the house: ${column.hint}. ` +
      `Place them ONLY on the building corners, not on windows. Keep the wall travertine ` +
      `and windows unchanged. White/cream, realistic scale.`;
  }

  // Межэтажный пояс — по фото-референсу (IMAGE {beltIndex}) или по тексту (fallback).
  if (belt && beltAsset) {
    prompt +=
      `\n\nIMAGE ${beltIndex} shows a horizontal inter-floor belt/molding. Add this exact belt ` +
      `profile as a HORIZONTAL decorative band running across the facade BETWEEN the floors ` +
      `(at the boundary between the 1st and 2nd floor), matching the profile and color from ` +
      `IMAGE ${beltIndex}. Keep it a thin horizontal band only. Do NOT put it on windows, ` +
      `corners, roof or ground. Ignore background in IMAGE ${beltIndex}, copy only the molding profile.`;
  } else if (belt) {
    prompt +=
      `\n\nAdd a horizontal inter-floor decorative belt/molding running across the facade ` +
      `between the 1st and 2nd floor: ${belt.hint}. Keep it a thin horizontal band only. ` +
      `Do NOT put it on windows, corners, roof or ground.`;
  }

  // Кронштейны — по фото-референсу (IMAGE {bracketIndex}) или по тексту (fallback).
  if (bracket && bracketAsset) {
    prompt +=
      `\n\nIMAGE ${bracketIndex} shows a decorative bracket/corbel. Add small brackets of ` +
      `EXACTLY this design (matching shape and color from IMAGE ${bracketIndex}) at the TOP ` +
      `CORNERS of each window trim — where the side pilasters meet the top cornice, left and ` +
      `right of every window. Do NOT place them under the roof, on walls or building corners ` +
      `— ONLY at the upper sides of window frames. Small, symmetric, natural scale. Ignore ` +
      `background in IMAGE ${bracketIndex}, copy only the bracket.`;
  } else if (bracket) {
    prompt +=
      `\n\nAdd small decorative brackets/corbels (${bracket.hint}) at the TOP CORNERS of each ` +
      `window trim — where the side pilasters meet the top cornice, left and right of every ` +
      `window. Do NOT place them under the roof, on walls or building corners — ONLY at the ` +
      `upper sides of window frames. Small, symmetric, natural scale.`;
  }

  // Доп. инструкции пользователя
  if (userComment) {
    prompt += `\n\nAdditional user instructions (follow them): ${userComment}`;
  }

  // contents.parts = текст + все референс-картинки по порядку
  const parts: any[] = [{ text: prompt }, ...imageParts];

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
