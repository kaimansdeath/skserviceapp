import mammoth from "mammoth";
import ExcelJS from "exceljs";

/**
 * Підготовка вхідних файлів до передачі в Anthropic API.
 * PDF та зображення йдуть нативними блоками; DOCX/XLSX конвертуються в текст.
 */

export type AiBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export type PreparedInput = {
  blocks: AiBlock[];
  /** Зображення (buffer + mime) для вставки у DOCX: обкладинка + деталі */
  photos: Array<{ buffer: Buffer; mime: string; name: string }>;
  notes: string[];
};

const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/;

export async function prepareInputs(
  files: Array<{ name: string; mime: string; buffer: Buffer }>
): Promise<PreparedInput> {
  const blocks: AiBlock[] = [];
  const photos: PreparedInput["photos"] = [];
  const notes: string[] = [];

  for (const f of files) {
    const lower = f.name.toLowerCase();
    try {
      if (f.mime === "application/pdf" || lower.endsWith(".pdf")) {
        blocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: f.buffer.toString("base64") },
        });
      } else if (IMAGE_MIME.test(f.mime)) {
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: f.mime, data: f.buffer.toString("base64") },
        });
        photos.push({ buffer: f.buffer, mime: f.mime, name: f.name });
      } else if (lower.endsWith(".docx")) {
        const res = await mammoth.extractRawText({ buffer: f.buffer });
        blocks.push({ type: "text", text: `Вміст файлу «${f.name}» (DOCX):\n${res.value.slice(0, 60000)}` });
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const text = await xlsxToText(f.buffer);
        blocks.push({ type: "text", text: `Вміст файлу «${f.name}» (таблиця):\n${text.slice(0, 60000)}` });
      } else if (lower.endsWith(".txt") || f.mime.startsWith("text/")) {
        blocks.push({ type: "text", text: `Вміст файлу «${f.name}»:\n${f.buffer.toString("utf8").slice(0, 60000)}` });
      } else if (lower.endsWith(".doc")) {
        notes.push(`Файл «${f.name}» у старому форматі .doc — не оброблено. Збережіть як .docx або PDF.`);
      } else {
        notes.push(`Файл «${f.name}» (${f.mime || "невідомий тип"}) пропущено — формат не підтримується.`);
      }
    } catch {
      notes.push(`Не вдалося прочитати файл «${f.name}».`);
    }
  }

  return { blocks, photos, notes };
}

async function xlsxToText(buffer: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const parts: string[] = [];
  wb.eachSheet((ws) => {
    parts.push(`--- Аркуш: ${ws.name} ---`);
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = (row.values as unknown[])
        .slice(1)
        .map((v) => cellToString(v))
        .join(" | ");
      if (vals.replace(/\|/g, "").trim()) parts.push(vals);
    });
  });
  return parts.join("\n");
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.result !== "undefined") return String(o.result ?? "");
    if (o.richText && Array.isArray(o.richText)) {
      return (o.richText as Array<{ text: string }>).map((r) => r.text).join("");
    }
    return "";
  }
  return String(v);
}
