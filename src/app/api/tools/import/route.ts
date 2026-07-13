import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Зіставлення назв класів (укр/рос/код) → enum */
const CLASS_MAP: Record<string, string> = {
  "ручний": "HAND", "ручной": "HAND", "hand": "HAND",
  "електричний": "ELECTRIC", "электрический": "ELECTRIC", "electric": "ELECTRIC",
  "вимірювальний": "MEASURING", "измерительный": "MEASURING", "measuring": "MEASURING",
  "оснастка": "TOOLING", "tooling": "TOOLING",
  "модулі": "MODULES", "модули": "MODULES", "modules": "MODULES",
  "зіп": "ZIP", "зип": "ZIP", "zip": "ZIP",
  "витратні": "CONSUMABLES", "витратні матеріали": "CONSUMABLES",
  "расходники": "CONSUMABLES", "consumables": "CONSUMABLES",
  "інше": "OTHER", "другое": "OTHER", "other": "OTHER",
};

const STATUS_MAP: Record<string, string> = {
  "робочий": "WORKING", "рабочий": "WORKING", "working": "WORKING",
  "зламаний": "BROKEN", "сломан": "BROKEN", "broken": "BROKEN",
  "втрачений": "LOST", "утерян": "LOST", "lost": "LOST",
};

/** Імпорт інструменту з Excel: колонки Назва | Інв.№ | Клас | Статус | — | Примітка */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STOREKEEPER"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await (file as File).arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) return NextResponse.json({ error: "EMPTY" }, { status: 400 });

  let created = 0;
  const rows: any[] = [];
  sheet.eachRow((row, n) => rows.push({ row, n }));

  for (const { row, n } of rows) {
    const cell = (i: number) => String(row.getCell(i).value ?? "").trim();
    const name = cell(1);
    if (!name) continue;
    // пропускаємо рядок-шапку
    if (n === 1 && /назва|название|name/i.test(name)) continue;

    const toolClass = CLASS_MAP[cell(3).toLowerCase()] ?? "OTHER";
    const status = STATUS_MAP[cell(4).toLowerCase()] ?? "WORKING";

    const tool = await prisma.tool.create({
      data: {
        name,
        inventoryNumber: cell(2) || null,
        toolClass: toolClass as any,
        status: status as any,
        note: cell(6) || null,
      },
    });
    await prisma.toolMovement.create({
      data: {
        toolId: tool.id,
        byUserId: session.user.id,
        text: "Імпортовано з Excel. Розміщення: склад",
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
