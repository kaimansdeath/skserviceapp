import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigest } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Щоденний дайджест керівникам (викликається Railway Cron о 08:00 Києва).
 * Захист: Authorization: Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const res = await sendDailyDigest();
  return NextResponse.json({ ok: true, ...res });
}
