import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import { Readable } from "stream";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { kpAbsPath } from "@/lib/kp/storage";

export const dynamic = "force-dynamic";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Скачування файлу КП з Volume */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const doc = await prisma.kpDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const abs = kpAbsPath(doc.filePath);
  if (!abs) return NextResponse.json({ error: "BAD_PATH" }, { status: 400 });

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return NextResponse.json({ error: "FILE_MISSING" }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(abs)) as unknown as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
    },
  });
}
