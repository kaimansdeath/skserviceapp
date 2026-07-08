import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { prisma } from "@/lib/prisma";
import { applyStatusChange } from "@/lib/taskService";
import { nextStatusesFor, type TaskStatusValue } from "@/lib/taskStatus";
import { formatDateUa, kyivToday, isOverdue } from "@/lib/dates";
import ukMsgs from "@/messages/uk.json";
import ruMsgs from "@/messages/ru.json";

/* ------------------------------------------------------------------ */
/* Тексти бота                                                         */
/* ------------------------------------------------------------------ */

const T = {
  uk: {
    linked: "✅ Telegram прив'язано. Тепер ви отримуватимете задачі сюди.",
    linkFail: "Код невірний або прострочений. Попросіть керівника згенерувати новий.",
    needCode:
      "Вітаю! Це бот сервісної служби СТАН КОМПЛЕКТ.\nДля прив'язки надішліть: /start КОД (код видає керівник відділу).",
    alreadyLinked: "Цей акаунт уже прив'язано.",
    newTask: "🆕 <b>Нова задача</b>",
    accepted: "✅ Прийнято. Оберіть статус, коли він зміниться:",
    statusSet: "Статус оновлено:",
    reasonAsk: "✍️ Напишіть причину невиконання одним повідомленням:",
    partialReasonAsk: "✍️ Напишіть, що саме не виконано, одним повідомленням:",
    questionAsk: "✍️ Напишіть ваше питання одним повідомленням — я передам керівнику:",
    questionSent: "📨 Питання передано керівнику.",
    questionNoAdmin:
      "Наразі керівник не підключений до Telegram — зателефонуйте йому напряму.",
    questionFrom: "❓ <b>Питання від бригадира</b>",
    noPermission: "У вас немає прав для цієї дії.",
    notLinked: "Ваш Telegram не прив'язано. Надішліть /start КОД.",
    unknown: "Не розумію. Використовуйте кнопки під повідомленнями із задачами.",
    saved: "Збережено.",
    contactsTitle: "📞 <b>Контакти замовника:</b>",
    noContacts: "Контактних осіб у картці клієнта немає.",
    myTasks: "📋 <b>Мої задачі (актуальні та майбутні):</b>",
    myArchive: "🗄 <b>Останні завершені задачі:</b>",
    current: "▶️ <b>Поточна задача:</b>",
    noTasks: "Актуальних задач немає.",
    noArchive: "Завершених задач ще немає.",
    noCurrent: "Активної задачі зараз немає.",
    fields: {
      type: "Тип",
      client: "Клієнт",
      machines: "Верстати",
      place: "Місце",
      invoice: "Рахунок",
      order: "Наказ",
      dates: "Дати",
      note: "Примітка",
      brigade: "Бригада",
      task: "Задача",
    },
    btn: { accept: "✅ Прийняв", question: "❓ Питання" },
    digest: {
      title: "📋 <b>Дайджест на",
      today: "📅 <b>Сьогодні в роботі:</b>",
      overdue: "🔴 <b>Прострочені:</b>",
      unconfirmed: "⏳ <b>Без підтвердження бригадиром:</b>",
      empty: "Сьогодні задач немає. Прострочених немає. Все під контролем ✅",
      none: "—",
    },
  },
  ru: {
    linked: "✅ Telegram привязан. Теперь вы будете получать задачи сюда.",
    linkFail: "Код неверный или просрочен. Попросите руководителя сгенерировать новый.",
    needCode:
      "Здравствуйте! Это бот сервисной службы СТАН КОМПЛЕКТ.\nДля привязки отправьте: /start КОД (код выдаёт руководитель отдела).",
    alreadyLinked: "Этот аккаунт уже привязан.",
    newTask: "🆕 <b>Новая задача</b>",
    accepted: "✅ Принято. Выберите статус, когда он изменится:",
    statusSet: "Статус обновлён:",
    reasonAsk: "✍️ Напишите причину невыполнения одним сообщением:",
    partialReasonAsk: "✍️ Напишите, что именно не выполнено, одним сообщением:",
    questionAsk: "✍️ Напишите ваш вопрос одним сообщением — я передам руководителю:",
    questionSent: "📨 Вопрос передан руководителю.",
    questionNoAdmin:
      "Сейчас руководитель не подключён к Telegram — позвоните ему напрямую.",
    questionFrom: "❓ <b>Вопрос от бригадира</b>",
    noPermission: "У вас нет прав для этого действия.",
    notLinked: "Ваш Telegram не привязан. Отправьте /start КОД.",
    unknown: "Не понимаю. Используйте кнопки под сообщениями с задачами.",
    saved: "Сохранено.",
    contactsTitle: "📞 <b>Контакты заказчика:</b>",
    noContacts: "Контактных лиц в карточке клиента нет.",
    myTasks: "📋 <b>Мои задачи (актуальные и будущие):</b>",
    myArchive: "🗄 <b>Последние завершённые задачи:</b>",
    current: "▶️ <b>Текущая задача:</b>",
    noTasks: "Актуальных задач нет.",
    noArchive: "Завершённых задач ещё нет.",
    noCurrent: "Активной задачи сейчас нет.",
    fields: {
      type: "Тип",
      client: "Клиент",
      machines: "Станки",
      place: "Место",
      invoice: "Счёт",
      order: "Приказ",
      dates: "Даты",
      note: "Примечание",
      brigade: "Бригада",
      task: "Задача",
    },
    btn: { accept: "✅ Принял", question: "❓ Вопрос" },
    digest: {
      title: "📋 <b>Дайджест на",
      today: "📅 <b>Сегодня в работе:</b>",
      overdue: "🔴 <b>Просроченные:</b>",
      unconfirmed: "⏳ <b>Без подтверждения бригадиром:</b>",
      empty: "Сегодня задач нет. Просроченных нет. Всё под контролем ✅",
      none: "—",
    },
  },
} as const;

type Lang = keyof typeof T;

function langOf(user: { locale?: string | null }): Lang {
  return user.locale === "RU" ? "ru" : "uk";
}

function statusLabel(lang: Lang, status: string): string {
  const msgs: any = lang === "ru" ? ruMsgs : ukMsgs;
  return msgs.status[status] ?? status;
}

function typeLabel(lang: Lang, taskType: string): string {
  const msgs: any = lang === "ru" ? ruMsgs : ukMsgs;
  return msgs.taskType[taskType] ?? taskType;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ------------------------------------------------------------------ */
/* Бот (лінивий singleton)                                             */
/* ------------------------------------------------------------------ */

const globalForBot = globalThis as unknown as { tgBot?: Bot };

export function getBot(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (!globalForBot.tgBot) {
    const bot = new Bot(token);
    registerHandlers(bot);
    globalForBot.tgBot = bot;
  }
  return globalForBot.tgBot;
}

export function getWebhookHandler() {
  const bot = getBot();
  if (!bot) return null;
  return webhookCallback(bot, "std/http", {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Картка задачі та клавіатури                                         */
/* ------------------------------------------------------------------ */

function taskCard(lang: Lang, task: any): string {
  const f = T[lang].fields;
  const lines = [
    T[lang].newTask,
    `<b>${f.type}:</b> ${typeLabel(lang, task.taskType)}`,
    `<b>${f.client}:</b> ${esc(task.client.name)}`,
  ];
  if (task.machines.length > 0) {
    lines.push(
      `<b>${f.machines}:</b> ${esc(
        task.machines
          .map((m: any) => `${m.model}${m.serialNumber ? ` (${m.serialNumber})` : ""}`)
          .join(", ")
      )}`
    );
  }
  lines.push(`<b>${f.place}:</b> ${esc(task.city)}, ${esc(task.oblast)}`);
  if (task.invoice) lines.push(`<b>${f.invoice}:</b> ${esc(task.invoice.number)}`);
  if (task.orderNumber) lines.push(`<b>${f.order}:</b> ${esc(task.orderNumber)}`);
  lines.push(`<b>${f.dates}:</b> ${formatDateUa(task.dateFrom)} — ${formatDateUa(task.dateTo)}`);
  if (task.note) lines.push(`<b>${f.note}:</b> ${esc(task.note)}`);
  if (task.secondBrigade) {
    lines.push(
      `<b>${f.brigade}:</b> ${esc(task.brigade?.name ?? "")} + ${esc(task.secondBrigade.name)}`
    );
  }
  return lines.join("\n");
}

function acceptKeyboard(lang: Lang, taskId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(T[lang].btn.accept, `acc:${taskId}`)
    .text(T[lang].btn.question, `q:${taskId}`);
}

function statusKeyboard(lang: Lang, taskId: string, current: TaskStatusValue): InlineKeyboard {
  const kb = new InlineKeyboard();
  const options = nextStatusesFor("BRIGADE_LEADER", current);
  let inRow = 0;
  for (const s of options) {
    kb.text(statusLabel(lang, s), `st:${s}:${taskId}`);
    inRow++;
    if (inRow === 2) {
      kb.row();
      inRow = 0;
    }
  }
  return kb;
}

function contactsBlock(lang: Lang, contacts: any[]): string {
  if (!contacts || contacts.length === 0) return T[lang].noContacts;
  return (
    T[lang].contactsTitle +
    "\n" +
    contacts
      .map((c) => {
        const parts = [c.position, c.fullName].filter(Boolean).map(esc);
        const phone = c.phone ? ` — <a href="tel:${esc(c.phone.replace(/\s/g, ""))}">${esc(c.phone)}</a>` : "";
        return `• ${parts.join(", ")}${phone}`;
      })
      .join("\n")
  );
}

function taskLine(lang: Lang, task: any): string {
  return `• ${formatDateUa(task.dateFrom)}–${formatDateUa(task.dateTo)} · ${esc(task.client.name)}, ${esc(
    task.city
  )} · ${statusLabel(lang, task.status)}`;
}

/** Умова "задачі бригадира" (основна або друга бригада) */
function brigadeWhere(user: any) {
  if (user.role === "BRIGADE_LEADER" && user.brigadeId) {
    return { OR: [{ brigadeId: user.brigadeId }, { secondBrigadeId: user.brigadeId }] };
  }
  return {};
}

/* ------------------------------------------------------------------ */
/* Вихідні сповіщення                                                  */
/* ------------------------------------------------------------------ */

/** Сповіщення бригадирам про призначену задачу (обидві бригади) */
export async function notifyTaskAssigned(taskId: string): Promise<void> {
  const bot = getBot();
  if (!bot) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      client: true,
      machines: true,
      invoice: true,
      brigade: { include: { users: { where: { role: "BRIGADE_LEADER", isActive: true } } } },
      secondBrigade: {
        include: { users: { where: { role: "BRIGADE_LEADER", isActive: true } } },
      },
    },
  });
  if (!task || task.executorType === "OUTSOURCE") return;

  const recipients = [
    ...(task.brigade?.users ?? []),
    ...(task.secondBrigade?.users ?? []),
  ].filter((u: any) => u.telegramChatId);

  for (const user of recipients) {
    const lang = langOf(user);
    try {
      await bot.api.sendMessage(user.telegramChatId!, taskCard(lang, task), {
        parse_mode: "HTML",
        reply_markup: acceptKeyboard(lang, task.id),
      });
    } catch {
      // не валимо операцію через збій відправлення (заблокований бот тощо)
    }
  }
}

/** Щоденний дайджест керівникам відділу */
export async function sendDailyDigest(): Promise<{ sent: number }> {
  const bot = getBot();
  if (!bot) return { sent: 0 };

  const today = kyivToday();
  const [admins, todayTasks, overdueTasks, unconfirmed] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ADMIN", isActive: true, telegramChatId: { not: null } },
    }),
    prisma.task.findMany({
      where: {
        dateFrom: { lte: today },
        dateTo: { gte: today },
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
      },
      include: { brigade: true, secondBrigade: true, client: true },
      orderBy: { dateFrom: "asc" },
    }),
    prisma.task.findMany({
      where: {
        dateTo: { lt: today },
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
      },
      include: { brigade: true, secondBrigade: true, client: true },
      orderBy: { dateTo: "asc" },
    }),
    prisma.task.findMany({
      where: { status: "ASSIGNED", dateFrom: { gte: today } },
      include: { brigade: true, secondBrigade: true, client: true },
      orderBy: { dateFrom: "asc" },
    }),
  ]);

  let sent = 0;
  for (const admin of admins) {
    const lang = langOf(admin);
    const d = T[lang].digest;

    const line = (task: any) => {
      const executor =
        task.executorType === "OUTSOURCE"
          ? task.outsourceName ?? "?"
          : `${task.brigade?.name ?? "?"}${task.secondBrigade ? ` + ${task.secondBrigade.name}` : ""}`;
      return `• ${formatDateUa(task.dateFrom)}–${formatDateUa(task.dateTo)} · ${esc(executor)} · ${esc(
        task.client.name
      )}, ${esc(task.city)} · ${statusLabel(lang, task.status)}`;
    };

    const parts: string[] = [`${d.title} ${formatDateUa(today)}</b>`];
    if (todayTasks.length === 0 && overdueTasks.length === 0 && unconfirmed.length === 0) {
      parts.push(d.empty);
    } else {
      parts.push("", d.today, todayTasks.length ? todayTasks.map(line).join("\n") : d.none);
      parts.push("", d.overdue, overdueTasks.length ? overdueTasks.map(line).join("\n") : d.none);
      parts.push("", d.unconfirmed, unconfirmed.length ? unconfirmed.map(line).join("\n") : d.none);
    }

    try {
      await bot.api.sendMessage(admin.telegramChatId!, parts.join("\n"), {
        parse_mode: "HTML",
      });
      sent++;
    } catch {
      // ignore
    }
  }
  return { sent };
}

/* ------------------------------------------------------------------ */
/* Обробники вхідних повідомлень                                       */
/* ------------------------------------------------------------------ */

async function userByChat(chatId: string) {
  return prisma.user.findUnique({ where: { telegramChatId: chatId } });
}

function registerHandlers(bot: Bot) {
  // /start [код]
  bot.command("start", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const code = (ctx.match ?? "").trim().toUpperCase();

    const existing = await userByChat(chatId);

    if (!code) {
      const lang = existing ? langOf(existing) : "uk";
      await ctx.reply(existing ? T[lang].alreadyLinked : T[lang].needCode);
      return;
    }

    const user = await prisma.user.findUnique({ where: { tgLinkCode: code } });
    if (!user || !user.tgLinkExpires || user.tgLinkExpires < new Date() || !user.isActive) {
      await ctx.reply(T.uk.linkFail);
      return;
    }

    // якщо цей chat був прив'язаний до іншого користувача — відв'язуємо
    if (existing && existing.id !== user.id) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { telegramChatId: null },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: chatId, tgLinkCode: null, tgLinkExpires: null },
    });
    await ctx.reply(T[langOf(user)].linked);
  });

  // ✅ Прийняв
  bot.callbackQuery(/^acc:(.+)$/, async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const taskId = ctx.match![1];
    const user = await userByChat(chatId);
    if (!user) return ctx.answerCallbackQuery({ text: T.uk.notLinked });
    const lang = langOf(user);

    const res = await applyStatusChange({
      taskId,
      to: "CONFIRMED",
      actor: { id: user.id, role: user.role, brigadeId: user.brigadeId },
      source: "TELEGRAM",
    });
    if ("error" in res) {
      // можливо, вже підтверджено іншим шляхом — просто показуємо клавіатуру статусів
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task && !["DONE", "PARTIALLY_DONE", "NOT_DONE"].includes(task.status)) {
        await ctx.editMessageReplyMarkup({
          reply_markup: statusKeyboard(lang, taskId, task.status as TaskStatusValue),
        });
      }
      return ctx.answerCallbackQuery();
    }
    await ctx.answerCallbackQuery({ text: T[lang].saved });
    const withContacts = await prisma.task.findUnique({
      where: { id: taskId },
      include: { client: { include: { contacts: true } } },
    });
    await ctx.reply(
      `${T[lang].accepted}\n\n${contactsBlock(lang, withContacts?.client.contacts ?? [])}`,
      {
        parse_mode: "HTML",
        reply_markup: statusKeyboard(lang, taskId, "CONFIRMED"),
      }
    );
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
  });

  // Кнопки статусів
  bot.callbackQuery(/^st:([A-Z_]+):(.+)$/, async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const to = ctx.match![1] as TaskStatusValue;
    const taskId = ctx.match![2];
    const user = await userByChat(chatId);
    if (!user) return ctx.answerCallbackQuery({ text: T.uk.notLinked });
    const lang = langOf(user);

    // статуси з причиною — запитуємо текст
    if (to === "NOT_DONE" || to === "PARTIALLY_DONE") {
      await prisma.user.update({
        where: { id: user.id },
        data: { tgPendingAction: JSON.stringify({ type: "status", status: to, taskId }) },
      });
      await ctx.answerCallbackQuery();
      await ctx.reply(to === "NOT_DONE" ? T[lang].reasonAsk : T[lang].partialReasonAsk);
      return;
    }

    const res = await applyStatusChange({
      taskId,
      to,
      actor: { id: user.id, role: user.role, brigadeId: user.brigadeId },
      source: "TELEGRAM",
    });
    if ("error" in res) {
      return ctx.answerCallbackQuery({
        text: res.error === "FORBIDDEN" ? T[lang].noPermission : T[lang].unknown,
      });
    }
    await ctx.answerCallbackQuery({ text: `${T[lang].statusSet} ${statusLabel(lang, to)}` });
    await ctx.editMessageReplyMarkup({
      reply_markup: statusKeyboard(lang, taskId, to),
    }).catch(() => {});
  });

  // ❓ Питання
  bot.callbackQuery(/^q:(.+)$/, async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const taskId = ctx.match![1];
    const user = await userByChat(chatId);
    if (!user) return ctx.answerCallbackQuery({ text: T.uk.notLinked });
    const lang = langOf(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { tgPendingAction: JSON.stringify({ type: "question", taskId }) },
    });
    await ctx.answerCallbackQuery();
    await ctx.reply(T[lang].questionAsk);
  });

  // Меню: /tasks — актуальні та майбутні
  bot.command("tasks", async (ctx) => {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) return ctx.reply(T.uk.notLinked);
    const lang = langOf(user);
    const tasks = await prisma.task.findMany({
      where: {
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
        ...brigadeWhere(user),
      },
      include: { client: true },
      orderBy: { dateFrom: "asc" },
      take: 15,
    });
    if (tasks.length === 0) return ctx.reply(T[lang].noTasks);
    await ctx.reply(`${T[lang].myTasks}\n${tasks.map((t: any) => taskLine(lang, t)).join("\n")}`, {
      parse_mode: "HTML",
    });
  });

  // Меню: /archive — завершені задачі бригадира
  bot.command("archive", async (ctx) => {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) return ctx.reply(T.uk.notLinked);
    const lang = langOf(user);
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
        ...brigadeWhere(user),
      },
      include: { client: true },
      orderBy: { dateTo: "desc" },
      take: 10,
    });
    if (tasks.length === 0) return ctx.reply(T[lang].noArchive);
    await ctx.reply(
      `${T[lang].myArchive}\n${tasks.map((t: any) => taskLine(lang, t)).join("\n")}`,
      { parse_mode: "HTML" }
    );
  });

  // Меню: /current — поточна задача (картка + кнопки статусів)
  bot.command("current", async (ctx) => {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) return ctx.reply(T.uk.notLinked);
    const lang = langOf(user);
    const today = kyivToday();

    // 1) активна зараз (В дорозі / На об'єкті, сьогодні в діапазоні)
    let task = await prisma.task.findFirst({
      where: {
        status: { in: ["EN_ROUTE", "ON_SITE"] },
        dateFrom: { lte: today },
        dateTo: { gte: today },
        ...brigadeWhere(user),
      },
      include: {
        client: { include: { contacts: true } },
        machines: true,
        invoice: true,
        brigade: true,
        secondBrigade: true,
      },
      orderBy: { dateTo: "asc" },
    });
    // 2) інакше — найближча незавершена
    if (!task) {
      task = await prisma.task.findFirst({
        where: {
          status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
          dateTo: { gte: today },
          ...brigadeWhere(user),
        },
        include: {
          client: { include: { contacts: true } },
          machines: true,
          invoice: true,
          brigade: true,
          secondBrigade: true,
        },
        orderBy: { dateFrom: "asc" },
      });
    }
    if (!task) return ctx.reply(T[lang].noCurrent);

    await ctx.reply(
      `${T[lang].current}\n${taskCard(lang, task)}\n\n${contactsBlock(lang, task.client.contacts)}`,
      {
        parse_mode: "HTML",
        reply_markup:
          task.status === "ASSIGNED"
            ? acceptKeyboard(lang, task.id)
            : statusKeyboard(lang, task.id, task.status as TaskStatusValue),
      }
    );
  });

  // Текстові повідомлення: причина або питання
  bot.on("message:text", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await userByChat(chatId);
    if (!user) return ctx.reply(T.uk.notLinked);
    const lang = langOf(user);

    if (!user.tgPendingAction) return ctx.reply(T[lang].unknown);

    let pending: any;
    try {
      pending = JSON.parse(user.tgPendingAction);
    } catch {
      pending = null;
    }
    await prisma.user.update({ where: { id: user.id }, data: { tgPendingAction: null } });
    if (!pending) return ctx.reply(T[lang].unknown);

    const text = ctx.message.text.trim();

    if (pending.type === "status") {
      const res = await applyStatusChange({
        taskId: pending.taskId,
        to: pending.status,
        reason: text,
        actor: { id: user.id, role: user.role, brigadeId: user.brigadeId },
        source: "TELEGRAM",
      });
      if ("error" in res) return ctx.reply(T[lang].noPermission);
      await ctx.reply(`${T[lang].statusSet} ${statusLabel(lang, pending.status)}`);
      return;
    }

    if (pending.type === "question") {
      const [task, admins] = await Promise.all([
        prisma.task.findUnique({
          where: { id: pending.taskId },
          include: { client: true, brigade: true },
        }),
        prisma.user.findMany({
          where: { role: "ADMIN", isActive: true, telegramChatId: { not: null } },
        }),
      ]);
      if (admins.length === 0) return ctx.reply(T[lang].questionNoAdmin);

      const bot2 = getBot()!;
      for (const admin of admins) {
        const alang = langOf(admin);
        const f = T[alang].fields;
        const info = task
          ? `\n<b>${f.task}:</b> ${esc(task.client.name)}, ${esc(task.city)} (${formatDateUa(
              task.dateFrom
            )}–${formatDateUa(task.dateTo)})`
          : "";
        await bot2.api
          .sendMessage(
            admin.telegramChatId!,
            `${T[alang].questionFrom}\n<b>${esc(user.name)}</b>${info}\n\n${esc(text)}`,
            { parse_mode: "HTML" }
          )
          .catch(() => {});
      }
      await ctx.reply(T[lang].questionSent);
    }
  });
}
