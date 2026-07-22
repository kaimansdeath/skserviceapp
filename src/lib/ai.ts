/**
 * Розгортання стислого звіту інженера у повноцінний технічний текст (українською).
 * Використовує Anthropic API; без ключа або при збої — повертає вихідний текст.
 */

export async function expandReportText(params: {
  rawText: string;
  taskTypeLabel: string;
  machines: string;
  clientName: string;
}): Promise<{ text: string; ai: boolean }> {
  const raw = params.rawText.trim();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || raw.length === 0) return { text: raw, ai: false };

  const system = [
    "Ти — технічний редактор сервісної служби промислового обладнання (верстати з ЧПК, лазерне обладнання).",
    "Твоє завдання: перетворити стислий чорновий звіт сервісного інженера на офіційний технічний опис виконаних робіт для акта виконаних робіт.",
    "Правила:",
    "- Пиши українською мовою, професійною технічною лексикою (термінологія: ЧПК, ПНР, шпиндель, супорт тощо).",
    "- НЕ вигадуй фактів, деталей, значень чи робіт, яких немає у вихідному тексті — лише розгортай і структуруй наявне.",
    "- Формат: 3–8 пунктів нумерованого списку або 2–4 абзаци, залежно від обсягу вихідних даних.",
    "- Без заголовків, дат, підписів, звертань — лише текст опису робіт.",
    "- Обсяг: 400–900 символів.",
  ].join("\n");

  const user = [
    `Тип виїзду: ${params.taskTypeLabel}`,
    `Обладнання: ${params.machines || "—"}`,
    `Замовник: ${params.clientName}`,
    "",
    "Чорновий звіт інженера:",
    raw,
  ].join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = await res.json();
    const text = (data?.content?.[0]?.text ?? "").trim();
    if (!text) throw new Error("empty");
    return { text, ai: true };
  } catch {
    return { text: raw, ai: false };
  }
}
