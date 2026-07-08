import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBot } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/** Встановлення webhook (відкривати в браузері під admin) */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const bot = getBot();
  if (!bot) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 503 });
  }
  const base = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL;
  if (!base) {
    return NextResponse.json({ error: "APP_BASE_URL not configured" }, { status: 500 });
  }
  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  try {
    await bot.api.setWebhook(url, {
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
    });
    await bot.api.setMyCommands([
      { command: "current", description: "Поточна задача" },
      { command: "tasks", description: "Мої задачі" },
      { command: "archive", description: "Архів задач" },
    ]);
    await bot.api.setMyCommands(
      [
        { command: "current", description: "Текущая задача" },
        { command: "tasks", description: "Мои задачи" },
        { command: "archive", description: "Архив задач" },
      ],
      { language_code: "ru" }
    );
    const info = await bot.api.getWebhookInfo();
    return NextResponse.json({ ok: true, webhook: url, info });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
