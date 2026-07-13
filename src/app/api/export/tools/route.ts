import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import uk from "@/messages/uk.json";
import ru from "@/messages/ru.json";

export const dynamic = "force-dynamic";

/**
 * Експорт списку інструменту в Excel.
 * Один рядок = одне розміщення (позиція, розподілена на 3 місця, дає 3 рядки з тим самим
 * інв.номером — це дозволяє коректно імпортувати назад розподіл за кількістю).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STOREKEEPER", "VIEWER", "ACCOUNTANT"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const locale = req.nextUrl.searchParams.get("locale") === "ru" ? "ru" : "uk";
  const msgs: any = locale === "ru" ? ru : uk;

  const tools = await prisma.tool.findMany({
    include: { allocations: { include: { brigade: true, user: true } } },
    orderBy: { name: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(msgs.tools.title);
  const header = sheet.addRow([
    msgs.tools.fields.name,
    msgs.tools.fields.manufacturer,
    msgs.tools.fields.inv,
    msgs.tools.fields.class,
    msgs.tools.fields.status,
    msgs.tools.excel.holderType,
    msgs.tools.excel.holderName,
    msgs.tools.fields.quantity,
    msgs.tools.fields.note,
  ]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009C4B" } };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [
    { width: 32 }, { width: 20 }, { width: 14 }, { width: 18 },
    { width: 14 }, { width: 14 }, { width: 22 }, { width: 12 }, { width: 30 },
  ];

  for (const x of tools as any[]) {
    const allocs = (x.allocations as any[]).filter((a: any) => a.quantity > 0);
    const rows = allocs.length > 0 ? allocs : [{ holderKind: "WAREHOUSE", quantity: 0 }];
    for (const a of rows) {
      const holderType =
        a.holderKind === "WAREHOUSE"
          ? msgs.tools.excel.typeWarehouse
          : a.holderKind === "BRIGADE"
            ? msgs.tools.excel.typeBrigade
            : msgs.tools.excel.typePerson;
      const holderName = a.holderKind === "WAREHOUSE" ? "" : a.brigade?.name ?? a.user?.name ?? "";
      sheet.addRow([
        x.name,
        x.manufacturer ?? "",
        x.inventoryNumber ?? "",
        msgs.tools.class[x.toolClass] ?? x.toolClass,
        msgs.tools.status[x.status] ?? x.status,
        holderType,
        holderName,
        a.quantity,
        x.note ?? "",
      ]);
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tools_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
