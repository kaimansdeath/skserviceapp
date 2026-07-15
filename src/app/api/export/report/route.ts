import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { buildMonthReport } from "@/lib/report";
import uk from "@/messages/uk.json";
import ru from "@/messages/ru.json";

export const dynamic = "force-dynamic";

/** Експорт місячного звіту в Excel: аркуші Виконавці / Бригади / Типи / Заявки+Клієнти */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "VIEWER", "ACCOUNTANT"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "BAD_MONTH" }, { status: 400 });
  }
  const locale = req.nextUrl.searchParams.get("locale") === "ru" ? "ru" : "uk";
  const msgs: any = locale === "ru" ? ru : uk;
  const R = msgs.reports;

  const report = await buildMonthReport(month);
  const wb = new ExcelJS.Workbook();

  const headStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009C4B" } };
    });
  };

  // --- Виконавці ---
  const s1 = wb.addWorksheet(R.byExecutors);
  headStyle(
    s1.addRow([R.cols.executor, R.cols.tasks, R.cols.days, R.cols.done, R.cols.notDone])
  );
  s1.columns = [{ width: 30 }, { width: 12 }, { width: 16 }, { width: 12 }, { width: 14 }];
  s1.views = [{ state: "frozen", ySplit: 1 }];
  for (const e of report.executors) {
    s1.addRow([
      e.isOutsource ? `${e.name} (${msgs.tasks.executor.OUTSOURCE})` : e.name,
      e.tasksTotal,
      e.daysInMonth,
      e.done,
      e.notDone,
    ]);
  }

  // --- Бригади ---
  const s2 = wb.addWorksheet(R.byBrigades);
  headStyle(s2.addRow([R.cols.brigade, R.cols.tasks, R.cols.done, R.cols.onTime]));
  s2.columns = [{ width: 26 }, { width: 12 }, { width: 12 }, { width: 14 }];
  s2.views = [{ state: "frozen", ySplit: 1 }];
  for (const b of report.brigades) {
    s2.addRow([b.name, b.tasksTotal, b.done, b.onTimePct != null ? `${b.onTimePct}%` : "—"]);
  }

  // --- Типи ---
  const s3 = wb.addWorksheet(R.byTypes);
  headStyle(s3.addRow([R.cols.type, R.cols.count, R.cols.avgDuration]));
  s3.columns = [{ width: 26 }, { width: 12 }, { width: 20 }];
  s3.views = [{ state: "frozen", ySplit: 1 }];
  for (const x of report.types) {
    s3.addRow([msgs.taskType[x.taskType] ?? x.taskType, x.count, x.avgDurationDays]);
  }

  // --- Заявки + Клієнти ---
  const s4 = wb.addWorksheet(R.requestsSheet);
  headStyle(s4.addRow([R.requestsSheet, ""]));
  s4.columns = [{ width: 36 }, { width: 16 }];
  s4.addRow([R.received, report.requests.received]);
  s4.addRow([R.closed, report.requests.closed]);
  s4.addRow([
    R.avgReaction,
    report.requests.avgReactionDays != null ? report.requests.avgReactionDays : "—",
  ]);
  s4.addRow([]);
  headStyle(s4.addRow([R.cols.client, R.cols.visits]));
  for (const c of report.topClients) {
    s4.addRow([c.name, c.count]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report_${month}.xlsx"`,
    },
  });
}
