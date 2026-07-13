import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import uk from "@/messages/uk.json";
import ru from "@/messages/ru.json";

export const dynamic = "force-dynamic";

/** Експорт списку інструменту в Excel */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STOREKEEPER", "VIEWER", "ACCOUNTANT"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const locale = req.nextUrl.searchParams.get("locale") === "ru" ? "ru" : "uk";
  const msgs: any = locale === "ru" ? ru : uk;

  const tools = await prisma.tool.findMany({
    include: { holderBrigade: true, holderUser: true },
    orderBy: { name: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(msgs.tools.title);
  const header = sheet.addRow([
    msgs.tools.fields.name,
    msgs.tools.fields.inv,
    msgs.tools.fields.class,
    msgs.tools.fields.status,
    msgs.tools.fields.holder,
    msgs.tools.fields.note,
  ]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009C4B" } };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [{ width: 36 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 24 }, { width: 32 }];

  for (const x of tools as any[]) {
    sheet.addRow([
      x.name,
      x.inventoryNumber ?? "",
      msgs.tools.class[x.toolClass] ?? x.toolClass,
      msgs.tools.status[x.status] ?? x.status,
      x.holderBrigade?.name ?? x.holderUser?.name ?? msgs.tools.warehouse,
      x.note ?? "",
    ]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tools_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
