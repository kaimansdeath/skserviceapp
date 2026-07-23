import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { defaultTemplate, ensureAllTemplates } from "@/lib/kp/templates";
import type { KpEquipmentTypeCode } from "@/lib/kp/constants";

export const dynamic = "force-dynamic";

const TYPES = new Set(["LASER", "CNC", "UNIVERSAL", "OTHER"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

/** Шаблони генерації: перегляд */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await ensureAllTemplates();
  const items = await prisma.kpTemplate.findMany({ orderBy: { equipmentType: "asc" } });
  return NextResponse.json({
    items: items.map((t: (typeof items)[number]) => ({
      equipmentType: t.equipmentType,
      systemPrompt: t.systemPrompt,
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

/** Шаблони генерації: збереження { equipmentType, systemPrompt } або скидання { equipmentType, reset: true } */
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: { equipmentType?: string; systemPrompt?: string; reset?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const type = String(body.equipmentType ?? "");
  if (!TYPES.has(type)) return NextResponse.json({ error: "BAD_TYPE" }, { status: 400 });

  const systemPrompt = body.reset
    ? defaultTemplate(type as KpEquipmentTypeCode)
    : String(body.systemPrompt ?? "").trim();
  if (!systemPrompt) return NextResponse.json({ error: "EMPTY_PROMPT" }, { status: 400 });

  const saved = await prisma.kpTemplate.upsert({
    where: { equipmentType: type as never },
    update: { systemPrompt },
    create: { equipmentType: type as never, systemPrompt },
  });

  return NextResponse.json({ ok: true, systemPrompt: saved.systemPrompt });
}
