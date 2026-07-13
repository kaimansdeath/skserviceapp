import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CLASS_MAP: Record<string, string> = {
  "ручний": "HAND", "ручной": "HAND", "hand": "HAND",
  "електричний": "ELECTRIC", "электрический": "ELECTRIC", "electric": "ELECTRIC",
  "вимірювальний": "MEASURING", "измерительный": "MEASURING", "measuring": "MEASURING",
  "оснастка": "TOOLING", "tooling": "TOOLING",
  "модулі": "MODULES", "модули": "MODULES", "modules": "MODULES",
  "зіп": "ZIP", "зип": "ZIP", "zip": "ZIP",
  "витратні матеріали": "CONSUMABLES", "витратні": "CONSUMABLES",
  "расходники": "CONSUMABLES", "consumables": "CONSUMABLES",
  "інше": "OTHER", "другое": "OTHER", "other": "OTHER",
};

const STATUS_MAP: Record<string, string> = {
  "робочий": "WORKING", "рабочий": "WORKING", "working": "WORKING",
  "зламаний": "BROKEN", "сломан": "BROKEN", "broken": "BROKEN",
  "втрачений": "LOST", "утерян": "LOST", "lost": "LOST",
};

const HOLDER_TYPE_MAP: Record<string, "WAREHOUSE" | "BRIGADE" | "PERSON"> = {
  "склад": "WAREHOUSE", "warehouse": "WAREHOUSE",
  "бригада": "BRIGADE", "brigade": "BRIGADE",
  "людина": "PERSON", "человек": "PERSON", "person": "PERSON",
};

/**
 * Імпорт інструменту з Excel.
 * Колонки: Назва | Виробник | Інв.№ | Клас | Статус | Тип розміщення | Назва розміщення | Кількість | Примітка.
 * Рядки з однаковою (Назва + Інв.№) об'єднуються в одну позицію — кожен рядок стає окремим розподілом.
 */
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

  const [brigades, people] = await Promise.all([
    prisma.brigade.findMany(),
    prisma.user.findMany({ where: { role: { in: ["BRIGADE_LEADER", "BRIGADE_MEMBER"] } } }),
  ]);
  const brigadeByName = new Map<string, string>(brigades.map((b: any) => [String(b.name).toLowerCase(), String(b.id)]));
  const personByName = new Map<string, string>(people.map((p: any) => [String(p.name).toLowerCase(), String(p.id)]));

  type Group = {
    name: string;
    manufacturer: string;
    inv: string;
    toolClass: string;
    status: string;
    note: string;
    allocs: { holderKind: "WAREHOUSE" | "BRIGADE" | "PERSON"; brigadeId?: string; userId?: string; quantity: number }[];
  };
  const groups = new Map<string, Group>();

  sheet.eachRow((row, n) => {
    const cell = (i: number) => String(row.getCell(i).value ?? "").trim();
    const name = cell(1);
    if (!name) return;
    if (n === 1 && /назва|название|name/i.test(name)) return;

    const manufacturer = cell(2);
    const inv = cell(3);
    const toolClass = CLASS_MAP[cell(4).toLowerCase()] ?? "OTHER";
    const status = STATUS_MAP[cell(5).toLowerCase()] ?? "WORKING";
    const holderTypeRaw = cell(6).toLowerCase();
    const holderName = cell(7);
    const quantity = parseInt(cell(8), 10) || 0;
    const note = cell(9);

    const key = `${name.toLowerCase()}|||${inv.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, { name, manufacturer, inv, toolClass, status, note, allocs: [] });
    }
    const g = groups.get(key)!;

    const holderKind = HOLDER_TYPE_MAP[holderTypeRaw] ?? "WAREHOUSE";
    if (holderKind === "BRIGADE") {
      const id = brigadeByName.get(holderName.toLowerCase());
      if (id) g.allocs.push({ holderKind: "BRIGADE", brigadeId: id, quantity });
      else g.allocs.push({ holderKind: "WAREHOUSE", quantity }); // бригаду не знайдено — на склад
    } else if (holderKind === "PERSON") {
      const id = personByName.get(holderName.toLowerCase());
      if (id) g.allocs.push({ holderKind: "PERSON", userId: id, quantity });
      else g.allocs.push({ holderKind: "WAREHOUSE", quantity });
    } else {
      g.allocs.push({ holderKind: "WAREHOUSE", quantity });
    }
  });

  let created = 0;
  for (const g of groups.values()) {
    // об'єднуємо кілька рядків "склад" в один запис розподілу
    const merged = new Map<string, { holderKind: "WAREHOUSE" | "BRIGADE" | "PERSON"; brigadeId?: string; userId?: string; quantity: number }>();
    for (const a of g.allocs) {
      const key = a.holderKind === "WAREHOUSE" ? "w" : a.holderKind === "BRIGADE" ? `b:${a.brigadeId}` : `p:${a.userId}`;
      if (!merged.has(key)) merged.set(key, { ...a, quantity: 0 });
      merged.get(key)!.quantity += a.quantity;
    }
    const total = [...merged.values()].reduce((s, a) => s + a.quantity, 0) || 1;

    const tool = await prisma.tool.create({
      data: {
        name: g.name,
        manufacturer: g.manufacturer || null,
        inventoryNumber: g.inv || null,
        toolClass: g.toolClass as any,
        status: g.status as any,
        quantity: total,
        note: g.note || null,
        allocations: {
          create:
            merged.size > 0
              ? [...merged.values()].map((a) => ({
                  holderKind: a.holderKind,
                  brigadeId: a.brigadeId,
                  userId: a.userId,
                  quantity: a.quantity,
                }))
              : [{ holderKind: "WAREHOUSE", quantity: total }],
        },
      },
    });
    await prisma.toolMovement.create({
      data: {
        toolId: tool.id,
        byUserId: session.user.id,
        text: `Імпортовано з Excel. Кількість: ${total}`,
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
