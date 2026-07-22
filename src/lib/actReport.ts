import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { formatDateUa } from "@/lib/dates";
import { warrantyEnd, DEFAULT_COMMISSIONING } from "@/lib/warranty";
import { expandReportText } from "@/lib/ai";
import ukMsgs from "@/messages/uk.json";

/** Акт виконаних робіт: збирання даних задачі + генерація PDF (A4, фірмовий стиль) */

const BRAND = "#009C4B";
const BRAND_DARK = "#007435";
const ORANGE = "#F36E33";
const GRAY = "#6B7280";
const TEXT = "#1F2937";

const FONTS = {
  regular: path.join(process.cwd(), "public/fonts/Montserrat-Regular.ttf"),
  semibold: path.join(process.cwd(), "public/fonts/Montserrat-SemiBold.ttf"),
  bold: path.join(process.cwd(), "public/fonts/Montserrat-Bold.ttf"),
};

const FOOTER_TEXT =
  process.env.REPORT_FOOTER ||
  "ТОВ «СТАН КОМПЛЕКТ» · м. Київ, Україна · тел.: +380 44 000 00 00 · service@stan-komplekt.ua · stankom.com";

export async function generateTaskReportPdf(
  taskId: string,
  opts: { byUserId?: string; regen?: boolean } = {}
): Promise<
  | { error: "NOT_FOUND" | "EMPTY_REPORT" }
  | { buffer: Buffer; number: number; fileName: string; aiUsed: boolean }
> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      client: { include: { contacts: true } },
      machines: true,
      assignees: { select: { id: true, name: true, role: true } },
      brigade: true,
      secondBrigade: true,
    },
  });
  if (!task) return { error: "NOT_FOUND" };

  const t: any = task;

  // --- вихідний текст робіт: підсумок закриття або примітка ---
  const rawText = (t.failureReason?.trim() || t.note?.trim() || "").trim();
  if (!rawText) return { error: "EMPTY_REPORT" };

  const typeLabel = (ukMsgs as any).taskType[t.taskType] ?? t.taskType;
  const machinesStr = t.machines
    .map((m: any) => `${m.model}${m.serialNumber ? ` (S/N: ${m.serialNumber})` : ""}`)
    .join("; ");

  // --- номер акта та ШІ-текст (кешується; regen оновлює) ---
  let report = await prisma.taskReport.findUnique({ where: { taskId } });
  let aiUsed = false;
  if (!report || opts.regen) {
    const expanded = await expandReportText({
      rawText,
      taskTypeLabel: typeLabel,
      machines: machinesStr,
      clientName: t.client.name,
    });
    aiUsed = expanded.ai;
    report = report
      ? await prisma.taskReport.update({
          where: { taskId },
          data: { aiText: expanded.text, byUserId: opts.byUserId ?? null },
        })
      : await prisma.taskReport.create({
          data: { taskId, aiText: expanded.text, byUserId: opts.byUserId ?? null },
        });
  }

  // --- дата заявки (якщо задача створена із заявки) ---
  const [srvReq, launchReq] = await Promise.all([
    prisma.serviceRequest.findFirst({ where: { taskId }, select: { createdAt: true } }),
    prisma.launchRequest.findFirst({ where: { taskId }, select: { createdAt: true } }),
  ]);
  const requestDate = srvReq?.createdAt ?? launchReq?.createdAt ?? t.createdAt;

  // --- гарантія: хоч один верстат задачі під гарантією на дату початку робіт ---
  let warrantyLabel = "—";
  if (t.taskType === "PNR") {
    warrantyLabel = "Гарантійний (пусконалагодження)";
  } else if (t.machines.length > 0) {
    let underWarranty = false;
    for (const m of t.machines) {
      const lastPnr = await prisma.task.findFirst({
        where: { machines: { some: { id: m.id } }, taskType: "PNR", status: "DONE", id: { not: taskId } },
        orderBy: { dateTo: "desc" },
        select: { dateTo: true },
      });
      const commissioning = lastPnr?.dateTo ?? DEFAULT_COMMISSIONING;
      const wEnd = warrantyEnd(commissioning, m.warrantyMonths);
      if (t.dateFrom <= wEnd) underWarranty = true;
    }
    warrantyLabel = underWarranty ? "Гарантійний" : "Позагарантійний";
  }

  const executors =
    t.executorType === "OUTSOURCE"
      ? `${t.outsourceName ?? "—"} (аутсорс)`
      : t.assignees.map((a: any) => a.name).join(", ") ||
        [t.brigade?.name, t.secondBrigade?.name].filter(Boolean).join(" + ") ||
        "—";
  const leaderName =
    t.assignees.find((a: any) => a.role === "BRIGADE_LEADER")?.name ??
    t.assignees.find((a: any) => a.role === "ADMIN")?.name ??
    "";
  const contact = t.client.contacts[0];
  const contactStr = contact
    ? `${contact.name}${contact.phone ? `, ${contact.phone}` : ""}`
    : "—";
  const statusLabel = (ukMsgs as any).status[t.status] ?? t.status;

  // ------------------------------------------------------------------
  // PDF
  // ------------------------------------------------------------------
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 44, left: 44, right: 44, bottom: 76 },
    info: { Title: `Акт виконаних робіт №${report.number}` },
  });
  doc.registerFont("reg", FONTS.regular);
  doc.registerFont("semi", FONTS.semibold);
  doc.registerFont("bold", FONTS.bold);
  doc.font("reg"); // до будь-якого тексту, щоб не чіпати стандартні afm-шрифти

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const pageW = doc.page.width;
  const left = 44;
  const right = pageW - 44;
  const contentW = right - left;

  const drawFooter = () => {
    const y = doc.page.height - 58;
    doc.save();
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1.2).strokeColor(ORANGE).stroke();
    doc
      .font("reg")
      .fontSize(7.5)
      .fillColor(GRAY)
      .text(FOOTER_TEXT, left, y + 7, { width: contentW, align: "center", lineBreak: false });
    doc.restore();
  };
  drawFooter();
  doc.on("pageAdded", drawFooter);

  // --- шапка ---
  doc.font("bold").fontSize(17).fillColor(BRAND).text("СТАН КОМПЛЕКТ", left, 44);
  doc.font("semi").fontSize(9).fillColor(GRAY).text("Сервісна служба · Промислове обладнання з ЧПК", left);
  doc
    .font("bold")
    .fontSize(13)
    .fillColor(TEXT)
    .text(`АКТ ВИКОНАНИХ РОБІТ № ${report.number}`, left, 46, { width: contentW, align: "right" });
  doc
    .font("reg")
    .fontSize(9)
    .fillColor(GRAY)
    .text(`від ${formatDateUa(new Date())}`, left, doc.y + 1, { width: contentW, align: "right" });

  doc.moveTo(left, 96).lineTo(right, 96).lineWidth(2).strokeColor(ORANGE).stroke();

  // --- таблиця реквізитів ---
  let y = 110;
  const rows: Array<[string, string]> = [
    ["Замовник", t.client.name],
    ["Контактна особа", contactStr],
    ["Обладнання", machinesStr || "—"],
    ["Тип виїзду", typeLabel],
    ["Дата заявки", formatDateUa(requestDate)],
    ["Період робіт", `${formatDateUa(t.dateFrom)} — ${formatDateUa(t.dateTo)}`],
    ["Виконавці", executors],
    ["Обслуговування", warrantyLabel],
    ["Статус заявки", statusLabel],
  ];
  const labelW = 150;
  for (const [label, value] of rows) {
    doc.font("semi").fontSize(9.5).fillColor(GRAY).text(label, left, y, { width: labelW });
    const h1 = doc.heightOfString(label, { width: labelW });
    doc
      .font("reg")
      .fontSize(9.5)
      .fillColor(TEXT)
      .text(value, left + labelW + 10, y, { width: contentW - labelW - 10 });
    const h2 = doc.heightOfString(value, { width: contentW - labelW - 10 });
    y += Math.max(h1, h2) + 7;
  }

  y += 6;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.7).strokeColor("#E5E7EB").stroke();
  y += 14;

  // --- виконані роботи ---
  doc.font("bold").fontSize(11).fillColor(BRAND_DARK).text("Виконані роботи", left, y);
  y = doc.y + 6;
  doc.font("reg").fontSize(10).fillColor(TEXT).text(report.aiText, left, y, {
    width: contentW,
    align: "justify",
    lineGap: 2.5,
  });

  // --- підписи (з переносом на нову сторінку за браком місця) ---
  let sy = doc.y + 34;
  if (sy > doc.page.height - 200) {
    doc.addPage();
    sy = 80;
  }
  const colW = (contentW - 40) / 2;
  const signLineY = sy + 46;

  doc.font("semi").fontSize(9.5).fillColor(GRAY).text("Від виконавця", left, sy);
  doc.font("reg").fontSize(9.5).fillColor(TEXT).text("Керівник бригади", left, sy + 15);
  doc.moveTo(left, signLineY).lineTo(left + colW - 60, signLineY).lineWidth(0.8).strokeColor(TEXT).stroke();
  doc.font("reg").fontSize(9).fillColor(TEXT).text(leaderName || " ", left, signLineY + 4, { width: colW - 60 });
  doc.fontSize(7.5).fillColor(GRAY).text("(підпис, ПІБ)", left, signLineY + 17);

  const rx = left + colW + 40;
  doc.font("semi").fontSize(9.5).fillColor(GRAY).text("Від замовника", rx, sy);
  doc.font("reg").fontSize(9.5).fillColor(TEXT).text("Представник замовника", rx, sy + 15);
  doc.moveTo(rx, signLineY).lineTo(rx + colW - 60, signLineY).lineWidth(0.8).strokeColor(TEXT).stroke();
  doc.font("reg").fontSize(9).fillColor(TEXT).text(contact?.name ?? " ", rx, signLineY + 4, { width: colW - 60 });
  doc.fontSize(7.5).fillColor(GRAY).text("(підпис, ПІБ)", rx, signLineY + 17);

  doc.end();
  const buffer = await done;

  return {
    buffer,
    number: report.number,
    fileName: `akt_${report.number}_${t.client.name.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 30)}.pdf`,
    aiUsed,
  };
}
