import { promises as fs } from "fs";
import path from "path";

/**
 * Зберігання вкладень на Railway Volume.
 * Volume монтується у контейнер (напр. /data); шлях задається UPLOADS_DIR.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR || "/data/uploads";

const ALLOWED_MIME = /^(image\/(jpeg|png|webp|heic|heif|gif)|video\/(mp4|quicktime|webm|3gpp))$/;

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.test(mime);
}

function sanitizeName(name: string): string {
  const base = path.basename(name).replace(/[^\p{L}\p{N}._-]+/gu, "_");
  return base.slice(-80) || "file";
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Папка задачі: tasks/<taskId>_<дата початку задачі> */
export function taskFolder(taskId: string, taskDateFrom: Date): string {
  return path.posix.join("tasks", `${taskId}_${ymd(taskDateFrom)}`);
}

/** Зберегти файл; повертає відносний шлях і розмір */
export async function saveTaskFile(
  taskId: string,
  taskDateFrom: Date,
  originalName: string,
  buffer: Buffer,
  mime: string
): Promise<{ relPath: string; fileName: string; size: number }> {
  const folder = taskFolder(taskId, taskDateFrom);
  const dir = path.join(UPLOADS_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const fileName = sanitizeName(originalName);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${fileName}`;
  const relPath = path.posix.join(folder, unique);
  await fs.writeFile(path.join(UPLOADS_DIR, relPath), buffer);
  return { relPath, fileName, size: buffer.length };
}

/** Абсолютний шлях з перевіркою, що не виходимо за межі сховища */
export function resolveStoredPath(relPath: string): string | null {
  const abs = path.resolve(UPLOADS_DIR, relPath);
  if (!abs.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) return null;
  return abs;
}
