import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UPLOADS_DIR } from "@/lib/uploads";
import { KP_ASSETS_DIR, KP_ASSET_FILES } from "@/lib/kp/constants";

export const dynamic = "force-dynamic";

/**
 * Самодіагностика модуля КП: /api/kp/diag
 * Показує, що саме не налаштовано (ключ, таблиці, диск, ассети).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const checks: Record<string, unknown> = {};

  checks.apiKey = process.env.ANTHROPIC_API_KEY ? "OK (задано)" : "ПОМИЛКА: ANTHROPIC_API_KEY не задано";
  checks.model = process.env.ANTHROPIC_KP_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5 (за замовчуванням)";

  try {
    const n = await prisma.kpDocument.count();
    checks.dbKpDocument = `OK (записів: ${n})`;
  } catch (e) {
    checks.dbKpDocument = `ПОМИЛКА: ${(e as Error).message.slice(0, 200)}`;
  }

  try {
    const n = await prisma.kpTemplate.count();
    checks.dbKpTemplate = `OK (шаблонів: ${n})`;
  } catch (e) {
    checks.dbKpTemplate = `ПОМИЛКА: ${(e as Error).message.slice(0, 200)}`;
  }

  const dir = path.join(UPLOADS_DIR, "kp");
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, `.probe_${Date.now()}`);
    await fs.writeFile(probe, "ok");
    await fs.unlink(probe);
    checks.storage = `OK (запис у ${dir})`;
  } catch (e) {
    checks.storage = `ПОМИЛКА запису у ${dir}: ${(e as Error).message.slice(0, 200)}`;
  }

  const assets: Record<string, string> = {};
  for (const [key, file] of Object.entries(KP_ASSET_FILES)) {
    try {
      const st = await fs.stat(path.join(KP_ASSETS_DIR, file));
      assets[key] = `OK (${Math.round(st.size / 1024)} КБ)`;
    } catch {
      assets[key] = "не знайдено";
    }
  }
  checks.assetsDir = KP_ASSETS_DIR;
  checks.assets = assets;

  const libs: Record<string, string> = {};
  for (const name of ["docx", "mammoth", "image-size", "exceljs"]) {
    try {
      require(name);
      libs[name] = "OK";
    } catch (e) {
      libs[name] = `ПОМИЛКА: ${(e as Error).message.slice(0, 150)}`;
    }
  }
  checks.libs = libs;

  return NextResponse.json(checks, { status: 200 });
}
