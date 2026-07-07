/**
 * Telegram-інтеграція. Повна реалізація — етап 3.
 * Зараз: безпечні заглушки, щоб CRUD-логіка вже викликала сповіщення.
 */

export async function notifyTaskAssigned(taskId: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  // Етап 3: надіслати бригадиру картку задачі з inline-кнопками
  void taskId;
}
