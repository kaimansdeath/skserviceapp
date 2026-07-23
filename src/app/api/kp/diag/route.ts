import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UPLOADS_DIR } from "@/lib/uploads";
import { KP_ASSETS_DIR, KP_ASSET_FILES } from "@/lib/kp/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Самодіагностика модуля КП: /api/kp/diag
 * Перевіряє ключ, таблиці, диск, ассети, бібліотеки і робить тестовий рендер DOCX
 * (без звернення до ШІ) — щоб локалізувати збій без доступу до логів.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const checks: Record<string, unknown> = {};

  checks.apiKey = process.env.ANTHROPIC_API_KEY
    ? `OK (задано, довжина ${process.env.ANTHROPIC_API_KEY.length})`
    : "ПОМИЛКА: ANTHROPIC_API_KEY не задано";
  checks.model = process.env.ANTHROPIC_KP_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5 (за замовчуванням)";
  checks.node = process.version;
  checks.memoryMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

  checks.dbKpDocument = await safe(async () => `OK (записів: ${await prisma.kpDocument.count()})`);
  checks.dbKpTemplate = await safe(async () => `OK (шаблонів: ${await prisma.kpTemplate.count()})`);

  const dir = path.join(UPLOADS_DIR, "kp");
  checks.storage = await safe(async () => {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, `.probe_${Date.now()}`);
    await fs.writeFile(probe, "ok");
    await fs.unlink(probe);
    return `OK (запис у ${dir})`;
  });

  const assets: Record<string, string> = {};
  for (const [key, file] of Object.entries(KP_ASSET_FILES)) {
    assets[key] = await safe(async () => {
      const st = await fs.stat(path.join(KP_ASSETS_DIR, file));
      return `OK (${Math.round(st.size / 1024)} КБ)`;
    });
  }
  checks.assetsDir = KP_ASSETS_DIR;
  checks.assets = assets;

  // Завантаження бібліотек по одній
  const libs: Record<string, string> = {};
  libs.docx = await safe(async () => {
    const m = await import("docx");
    return typeof m.Document === "function" ? "OK" : "ПОМИЛКА: немає Document";
  });
  libs.mammoth = await safe(async () => {
    const m = await import("mammoth");
    return typeof m.extractRawText === "function" ? "OK" : "ПОМИЛКА: немає extractRawText";
  });
  libs["image-size"] = await safe(async () => {
    const m = (await import("image-size")) as unknown as Record<string, unknown>;
    const fn = m.imageSize ?? (m.default as Record<string, unknown> | undefined)?.imageSize ?? m.default;
    return typeof fn === "function" ? "OK" : "ПОМИЛКА: немає imageSize";
  });
  libs.exceljs = await safe(async () => {
    const m = await import("exceljs");
    return m ? "OK" : "ПОМИЛКА";
  });
  checks.libs = libs;

  // Тестовий рендер DOCX без ШІ
  checks.testRender = await safe(async () => {
    const { renderKpDocx } = await import("@/lib/kp/render");
    const res = await renderKpDocx({
      ai: {
        fullName: "ТЕСТОВИЙ ВЕРСТАТ",
        controlType: "CNC",
        about: ["Тестовий опис."],
        specs: [{ param: "Тест", unit: "мм", value: "100" }],
        equipment: ["Тест"],
        options: ["Тест"],
        extraModels: [],
        warnings: [],
      },
      machineName: "TEST",
      price: "1000",
      currency: "грн",
      deliveryTerm: "тест",
      photos: [],
    });
    return `OK (DOCX ${Math.round(res.buffer.length / 1024)} КБ, попереджень: ${res.warnings.length})`;
  });

  return NextResponse.json(checks, { status: 200 });
}

async function safe(fn: () => Promise<string>): Promise<string> {
  try {
    return await fn();
  } catch (e) {
    const err = e as Error;
    return `ПОМИЛКА: ${(err?.message || String(e)).slice(0, 300)}`;
  }
}
