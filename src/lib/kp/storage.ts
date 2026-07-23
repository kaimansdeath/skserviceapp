import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_DIR } from "@/lib/uploads";

/** Файли КП зберігаються на тому ж Railway Volume у підпапці kp/ */

function sanitize(name: string): string {
  return name.replace(/[^\p{L}\p{N}._ -]+/gu, "_").replace(/\s+/g, "_").slice(0, 80) || "KP";
}

export function kpFileName(machineName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `KP_${sanitize(machineName)}_${date}.docx`;
}

export async function saveKpFile(machineName: string, buffer: Buffer): Promise<{ relPath: string; fileName: string; size: number }> {
  const fileName = kpFileName(machineName);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${fileName}`;
  const relPath = path.posix.join("kp", unique);
  const dir = path.join(UPLOADS_DIR, "kp");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, relPath), buffer);
  return { relPath, fileName, size: buffer.length };
}

export function kpAbsPath(relPath: string): string | null {
  const abs = path.resolve(UPLOADS_DIR, relPath);
  const root = path.resolve(UPLOADS_DIR, "kp");
  if (!abs.startsWith(root + path.sep)) return null;
  return abs;
}
