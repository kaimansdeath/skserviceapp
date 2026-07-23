import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { kpAbsPath } from "@/lib/kp/storage";

export const dynamic = "force-dynamic";

/** Видалення КП з бібліотеки (разом із файлом на диску) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const doc = await prisma.kpDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const abs = kpAbsPath(doc.filePath);
  if (abs) {
    try {
      await fs.unlink(abs);
    } catch {
      // файл міг бути вже відсутній — запис однаково видаляємо
    }
  }
  await prisma.kpDocument.delete({ where: { id: doc.id } });
  return NextResponse.json({ ok: true });
}
