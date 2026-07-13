import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.endpoint) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint: body.endpoint, userId: session.user.id } })
      .catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
