import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import { Readable } from "stream";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredPath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Віддача файлів з Volume (лише авторизованим) */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const relPath = params.path.join("/");
  const att = await prisma.taskAttachment.findUnique({ where: { filePath: relPath } });
  if (!att) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const abs = resolveStoredPath(relPath);
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
      "Content-Type": att.mimeType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(att.fileName)}`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
