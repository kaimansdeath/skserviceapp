import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveTaskFile, isAllowedMime } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MAX_SIZE = 100 * 1024 * 1024; // 100 МБ на файл

/** Завантаження фото/відео до задачі (звіт при зміні статусу) */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { assignees: { select: { id: true } } },
  });
  if (!task) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isAssignee = (task as any).assignees.some((a: any) => a.id === session.user.id);
  if (session.user.role !== "ADMIN" && !isAssignee) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => typeof f !== "string");
  if (files.length === 0) return NextResponse.json({ error: "NO_FILES" }, { status: 400 });

  const saved: { id: string; fileName: string }[] = [];
  for (const file of files) {
    if (!isAllowedMime(file.type)) continue;
    if (file.size > MAX_SIZE) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { relPath, fileName, size } = await saveTaskFile(
      task.id,
      task.dateFrom,
      file.name,
      buffer,
      file.type
    );
    const att = await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        fileName,
        filePath: relPath,
        mimeType: file.type,
        size,
        byUserId: session.user.id,
      },
    });
    saved.push({ id: att.id, fileName });
  }

  return NextResponse.json({ ok: true, saved: saved.length });
}
