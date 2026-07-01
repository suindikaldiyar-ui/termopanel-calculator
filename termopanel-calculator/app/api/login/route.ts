import { NextRequest, NextResponse } from "next/server";
import { sha256Hex, AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SITE_PASSWORD не настроен на сервере." },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const hash = await sha256Hex(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // ~30 дней
  });
  return res;
}
