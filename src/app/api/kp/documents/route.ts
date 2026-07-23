import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TYPES = new Set(["LASER", "CNC", "UNIVERSAL", "OTHER"]);

/** Бібліотека КП: список з фільтром за типом та пошуком за назвою */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const q = (searchParams.get("q") ?? "").trim();

  const docs = await prisma.kpDocument.findMany({
    where: {
      ...(TYPES.has(type) ? { equipmentType: type as never } : {}),
      ...(q ? { machineName: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { byUser: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({
    items: docs.map((d: (typeof docs)[number]) => ({
      id: d.id,
      machineName: d.machineName,
      equipmentType: d.equipmentType,
      fileName: d.fileName,
      size: d.size,
      price: d.price,
      currency: d.currency,
      warnings: d.warnings ? (JSON.parse(d.warnings) as string[]) : [],
      byUserName: d.byUser?.name ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
