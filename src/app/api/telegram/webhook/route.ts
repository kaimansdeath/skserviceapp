import { NextRequest, NextResponse } from "next/server";
import { getWebhookHandler } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Webhook Telegram. Захищений секретним токеном:
 * grammY звіряє заголовок X-Telegram-Bot-Api-Secret-Token.
 */
export async function POST(req: NextRequest) {
  const handler = getWebhookHandler();
  if (!handler) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 503 });
  }
  try {
    return await handler(req);
  } catch (e) {
    console.error("[telegram webhook]", e);
    // 200, щоб Telegram не ретраїв нескінченно
    return NextResponse.json({ ok: false });
  }
}
