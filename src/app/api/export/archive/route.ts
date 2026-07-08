import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dateFieldFromYmd, archiveCutoff, formatDateUa } from "@/lib/dates";
import { FINAL_STATUSES } from "@/lib/taskStatus";
import uk from "@/messages/uk.json";
import ru from "@/messages/ru.json";

export const dynamic = "force-dynamic";

/** Експорт архіву в Excel: окремий лист на кожну бригаду (+ лист «Аутсорс») */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "VIEWER", "ACCOUNTANT"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const locale = sp.get("locale") === "ru" ? "ru" : "uk";
  const msgs: any = locale === "ru" ? ru : uk;
  const q = sp.get("q")?.trim();
  const brigade = sp.get("brigade") || undefined;
  const status = sp.get("status") || undefined;
  const from = sp.get("from") || undefined;
  const to = sp.get("to") || undefined;

  const tasks = await prisma.task.findMany({
    where: {
      status: status ? (status as any) : { in: FINAL_STATUSES as any },
      dateTo: { lt: archiveCutoff(), ...(to ? { lte: dateFieldFromYmd(to) } : {}) },
      ...(from ? { dateFrom: { gte: dateFieldFromYmd(from) } } : {}),
      ...(brigade ? { OR: [{ brigadeId: brigade }, { secondBrigadeId: brigade }] } : {}),
      ...(q
        ? {
            OR: [
              { client: { name: { contains: q, mode: "insensitive" } } },
              { invoice: { number: { contains: q, mode: "insensitive" } } },
              { orderNumber: { contains: q, mode: "insensitive" } },
              { machines: { some: { model: { contains: q, mode: "insensitive" } } } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      brigade: true,
      secondBrigade: true,
      client: true,
      machines: true,
      invoice: true,
    },
    orderBy: { dateTo: "desc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "СТАН КОМПЛЕКТ · Сервісна служба";

  const headers = [
    msgs.tasks.fields.dateFrom,
    msgs.tasks.fields.dateTo,
    msgs.tasks.fields.taskType,
    msgs.tasks.fields.client,
    msgs.tasks.fields.city,
    msgs.tasks.fields.oblast,
    msgs.tasks.fields.machines,
    msgs.tasks.fields.invoice,
    msgs.tasks.fields.orderNumber,
    msgs.tasks.fields.status,
    msgs.tasks.fields.failureReason,
    msgs.tasks.fields.note,
  ];

  function addSheet(name: string, rows: any[]) {
    // Excel: назва листа ≤ 31 символ, без спецсимволів
    const sheet = wb.addWorksheet(name.replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || "—");
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009C4B" } };
      cell.alignment = { vertical: "middle" };
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.columns = [
      { width: 12 }, { width: 12 }, { width: 14 }, { width: 32 }, { width: 16 },
      { width: 18 }, { width: 32 }, { width: 16 }, { width: 16 }, { width: 22 },
      { width: 30 }, { width: 30 },
    ];
    for (const task of rows) {
      sheet.addRow([
        formatDateUa(task.dateFrom),
        formatDateUa(task.dateTo),
        msgs.taskType[task.taskType] ?? task.taskType,
        task.client.name,
        task.city,
        task.oblast,
        task.machines.map((m: any) => m.model).join(", "),
        task.invoice?.number ?? "",
        task.orderNumber ?? "",
        msgs.status[task.status] ?? task.status,
        task.failureReason ?? "",
        task.note ?? "",
      ]);
    }
  }

  // Лист на кожну бригаду (задача з другою бригадою потрапляє на обидва листи)
  const brigadeIds = new Map<string, { name: string; rows: any[] }>();
  const outsource: any[] = [];
  for (const task of tasks as any[]) {
    if (task.executorType === "OUTSOURCE") {
      outsource.push(task);
      continue;
    }
    for (const b of [task.brigade, task.secondBrigade]) {
      if (!b) continue;
      if (!brigadeIds.has(b.id)) brigadeIds.set(b.id, { name: b.name, rows: [] });
      brigadeIds.get(b.id)!.rows.push(task);
    }
  }
  const sorted = [...brigadeIds.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const { name, rows } of sorted) addSheet(name, rows);
  if (outsource.length > 0) addSheet(msgs.tasks.executor.OUTSOURCE, outsource);
  if (wb.worksheets.length === 0) addSheet(msgs.archive.title, []);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `archive_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
