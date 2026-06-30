import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { TEXTURES } from "@/lib/textures";
import { getFoundation } from "@/lib/foundations";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

interface Body {
  image?: string; // фото дома, base64 (без префикса data:)
  mimeType?: string; // напр. image/jpeg
  textureId?: string; // id выбранной текстуры
  foundationId?: string; // id отделки цоколя
  comment?: string; // доп. комментарий пользователя
}

type TextureData = { data: string; mimeType: string; bytes: number };

// 1) Приоритет: читаем фото текстуры с диска (благодаря outputFileTracingIncludes
//    файлы попадают в serverless-бандл на Vercel).
function loadTextureFromDisk(textureId: string): TextureData | null {
  try {
    const filePath = join(process.cwd(), "public", "textures", `${textureId}.jpg`);
    const buf = readFileSync(filePath);
    console.log(`texture loaded (disk): ${textureId}, ${buf.length} bytes`);
    return { data: buf.toString("base64"), mimeType: "image/jpeg", bytes: buf.length };
  } catch {
    return null; // файла нет в бандле
  }
}

// 2) Подстраховка: если файла нет в бандле — тянем по публичному URL.
async function loadTextureFromUrl(
  textureId: string,
  origin: string | null
): Promise<TextureData | null> {
  if (!origin) return null;
  try {
    const res = await fetch(`${origin}/textures/${textureId}.jpg`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`texture loaded (url): ${textureId}, ${buf.length} bytes`);
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

  const { image, textureId, foundationId, comment } = body;
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
  let texture = loadTextureFromDisk(textureId);
  if (!texture) {
    texture = await loadTextureFromUrl(textureId, getOrigin(req));
  }
  if (!texture) {
    return NextResponse.json(
      { error: `Текстура ${textureId} не найдена в public/textures/` },
      { status: 400 }
    );
  }

  const foundation = getFoundation(foundationId);
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

  // Цоколь — разрешённое исключение (если выбран не "Без цоколя")
  if (foundation.hint) {
    prompt +=
      `\n\nAlso clad the base/plinth along the bottom of the walls (about 0.4-0.5 m high) ` +
      `in ${foundation.hint}, with a crisp clean top edge. This plinth is an intended addition.`;
  }

  // Доп. инструкции пользователя
  if (userComment) {
    prompt += `\n\nAdditional user instructions (follow them): ${userComment}`;
  }

  // contents.parts = [ {text}, {inline_data: дом}, {inline_data: текстура} ]
  const parts: any[] = [
    { text: prompt },
    { inline_data: { mime_type: mimeType, data: image } }, // IMAGE 1 — дом
    { inline_data: { mime_type: texture.mimeType, data: texture.data } }, // IMAGE 2 — текстура
  ];

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
