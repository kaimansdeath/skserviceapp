import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTaskReportPdf } from "@/lib/actReport";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // ШІ-виклик може тривати до ~20 с

/** Акт виконаних робіт у PDF — за запитом (керівник відділу або бригадир-виконавець) */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { assignees: { select: { id: true, role: true } } },
  });
  if (!task) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isLeaderAssignee = (task as any).assignees.some(
    (a: any) => a.id === session.user.id && ["BRIGADE_LEADER", "ADMIN"].includes(a.role)
  );
  if (session.user.role !== "ADMIN" && session.user.role !== "VIEWER" && !isLeaderAssignee) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const regen = req.nextUrl.searchParams.get("regen") === "1" && session.user.role === "ADMIN";
  const result = await generateTaskReportPdf(params.id, {
    byUserId: session.user.id,
    regen,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 400 });
  }

  return new NextResponse(result.buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
