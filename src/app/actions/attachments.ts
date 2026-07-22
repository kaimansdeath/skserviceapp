"use server";

import { promises as fs } from "fs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { resolveStoredPath } from "@/lib/uploads";

/** Видалення вкладення — лише керівник відділу (файл + запис у БД) */
export async function deleteAttachment(attachmentId: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") return { error: "FORBIDDEN" as const };

  const att = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
  if (!att) return { error: "NOT_FOUND" as const };

  const abs = resolveStoredPath(att.filePath);
  if (abs) await fs.unlink(abs).catch(() => {}); // файла може вже не бути — не валимо операцію

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
