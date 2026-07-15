import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { prisma } from "@/lib/prisma";
import { applyStatusChange } from "@/lib/taskService";
import { nextStatusesFor, type TaskStatusValue } from "@/lib/taskStatus";
import { formatDateUa, kyivToday, isOverdue } from "@/lib/dates";
import { sendPushToUsers, sendPushToRoles } from "@/lib/push";
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
    doneCommentAsk: "✍️ Напишіть короткий підсумок виконаних робіт одним повідомленням:",
    answerAsk: "✍️ Напишіть відповідь одним повідомленням — я передам бригадиру:",
    answerSent: "📨 Відповідь передано бригадиру.",
    answerFrom: "💬 <b>Відповідь керівника</b>",
    commentFrom: "💬 <b>Коментар до задачі</b>",
    btnReply: "↩️ Відповісти",
    reqBtn: "🛠 Запит на виїзд",
    reqIntro:
      "Це бот сервісної служби СТАН КОМПЛЕКТ.\n\nЯкщо ви клієнт і потрібен виїзд сервісного інженера — натисніть кнопку нижче.\nЯкщо ви співробітник — надішліть /start КОД (код видає керівник відділу).",
    reqAskSerial: "Введіть серійний номер верстата з шильда одним повідомленням:",
    reqNoSnBtn: "Залишити заявку без S/N",
    reqSharePhone: "📱 Поділитися моїм номером",
    reqFound: "✅ Верстат знайдено в базі:",
    reqAskProblem: "Опишіть проблему одним повідомленням:",
    reqNotFound:
      "Верстат із таким серійним номером у базі не знайдено — оформимо заявку вручну.\n\nВкажіть тип верстата (наприклад: лазер, токарний з ЧПК, листозгин):",
    reqAskModel: "Назва / модель верстата:",
    reqAskName: "Ваше ім'я:",
    reqAskPhone: "Контактний номер телефону:",
    reqSaved:
      "✅ Заявку прийнято! Керівник сервісної служби зв'яжеться з вами найближчим часом.",
    reqAdminTitle: "🆕 <b>Заявка на виїзд</b>",
    reqAccepted:
      "✅ Ваша заявка прийнята в роботу — виїзд сервісної служби заплановано. Дякуємо за звернення!",
    toolBuyAsk: "✍️ Опишіть, який інструмент потрібно закупити (назва, кількість, для чого):",
    toolIssueAsk:
      "✍️ Опишіть, який інструмент видати зі складу і кому (бригада чи конкретна людина):",
    toolReqSaved: "📨 Заявку передано. Ви отримаєте повідомлення після її опрацювання.",
    toolBuyTitle: "🛒 <b>Заявка на закупку інструменту</b>",
    toolIssueTitle: "📦 <b>Заявка на видачу інструменту</b>",
    toolReqDone: "✅ Вашу заявку опрацьовано:",
    toolReqRejected: "❌ Вашу заявку відхилено:",
    onlyLeaders: "Ця дія доступна лише бригадирам.",
    toolAskKind: "Оберіть тип заявки на інструмент:",
    toolKindBuy: "🛒 Закупка",
    toolKindIssue: "📦 Видача зі складу",
    toolReqApproved: "✅ Вашу заявку на видачу погоджено — комірник підготує інструмент:",
    toolIssueApprovedTitle: "📦 <b>Погоджена видача — підготуйте інструмент</b>",
    reqLabels: {
      sn: "S/N",
      type: "Тип",
      model: "Модель",
      contact: "Контакт",
      phone: "Телефон",
      problem: "Проблема",
    },

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
      executors: "Виконавці",
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
    doneCommentAsk: "✍️ Напишите краткий итог выполненных работ одним сообщением:",
    answerAsk: "✍️ Напишите ответ одним сообщением — я передам бригадиру:",
    answerSent: "📨 Ответ передан бригадиру.",
    answerFrom: "💬 <b>Ответ руководителя</b>",
    commentFrom: "💬 <b>Комментарий к задаче</b>",
    btnReply: "↩️ Ответить",
    reqBtn: "🛠 Заявка на выезд",
    reqIntro:
      "Это бот сервисной службы СТАН КОМПЛЕКТ.\n\nЕсли вы клиент и нужен выезд сервисного инженера — нажмите кнопку ниже.\nЕсли вы сотрудник — отправьте /start КОД (код выдаёт руководитель отдела).",
    reqAskSerial: "Введите серийный номер станка с шильда одним сообщением:",
    reqNoSnBtn: "Оставить заявку без S/N",
    reqSharePhone: "📱 Поделиться моим номером",
    reqFound: "✅ Станок найден в базе:",
    reqAskProblem: "Опишите проблему одним сообщением:",
    reqNotFound:
      "Станок с таким серийным номером в базе не найден — оформим заявку вручную.\n\nУкажите тип станка (например: лазер, токарный с ЧПУ, листогиб):",
    reqAskModel: "Название / модель станка:",
    reqAskName: "Ваше имя:",
    reqAskPhone: "Контактный номер телефона:",
    reqSaved:
      "✅ Заявка принята! Руководитель сервисной службы свяжется с вами в ближайшее время.",
    reqAdminTitle: "🆕 <b>Заявка на выезд</b>",
    reqAccepted:
      "✅ Ваша заявка принята в работу — выезд сервисной службы запланирован. Спасибо за обращение!",
    toolBuyAsk: "✍️ Опишите, какой инструмент нужно закупить (название, количество, для чего):",
    toolIssueAsk:
      "✍️ Опишите, какой инструмент выдать со склада и кому (бригада или конкретный человек):",
    toolReqSaved: "📨 Заявка передана. Вы получите сообщение после её обработки.",
    toolBuyTitle: "🛒 <b>Заявка на закупку инструмента</b>",
    toolIssueTitle: "📦 <b>Заявка на выдачу инструмента</b>",
    toolReqDone: "✅ Ваша заявка обработана:",
    toolReqRejected: "❌ Ваша заявка отклонена:",
    onlyLeaders: "Это действие доступно только бригадирам.",
    toolAskKind: "Выберите тип заявки на инструмент:",
    toolKindBuy: "🛒 Закупка",
    toolKindIssue: "📦 Выдача со склада",
    toolReqApproved: "✅ Ваша заявка на выдачу согласована — кладовщик подготовит инструмент:",
    toolIssueApprovedTitle: "📦 <b>Согласованная выдача — подготовьте инструмент</b>",
    reqLabels: {
      sn: "S/N",
      type: "Тип",
      model: "Модель",
      contact: "Контакт",
      phone: "Телефон",
      problem: "Проблема",
    },

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
      executors: "Исполнители",
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

function langFromCtx(ctx: any): Lang {
  return String(ctx.from?.language_code ?? "").startsWith("ru") ? "ru" : "uk";
}

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
  if (task.address || (task.lat != null && task.lng != null)) {
    const addr = task.address ? esc(task.address) : "";
    const link =
      task.lat != null && task.lng != null
        ? ` <a href="https://www.google.com/maps?q=${task.lat},${task.lng}">🗺</a>`
        : "";
    lines.push(`📍 ${addr}${link}`);
  }
  const assignees = (task.assignees ?? []).map((a: any) => a.name).filter(Boolean);
  if (assignees.length > 0) {
    lines.push(`<b>${f.executors}:</b> ${esc(assignees.join(", "))}`);
  } else if (task.secondBrigade) {
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
        // телефон plain-текстом у міжнародному форматі — Telegram сам робить його клікабельним
        const phone = c.phone ? ` — ${esc(c.phone)}` : "";
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

/** Умова видимості задач для польового персоналу */
function assigneeWhere(user: any) {
  if (user.role === "BRIGADE_LEADER" || user.role === "BRIGADE_MEMBER") {
    const base: any = { assignees: { some: { id: user.id } } };
    // працівник бачить задачу лише ПІСЛЯ підтвердження бригадиром
    if (user.role === "BRIGADE_MEMBER") {
      return { AND: [base, { status: { not: "ASSIGNED" } }] };
    }
    return base;
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
      brigade: true,
      secondBrigade: true,
      assignees: { where: { isActive: true } },
    },
  });
  if (!task || task.executorType === "OUTSOURCE") return;

  // запит на підтвердження — ТІЛЬКИ бригадирам серед призначених
  const recipients = (task as any).assignees.filter(
    (u: any) => ["BRIGADE_LEADER", "ADMIN"].includes(u.role) && u.telegramChatId
  );

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

  // Web Push бригадирам-виконавцям
  sendPushToUsers(
    (task as any).assignees
      .filter((u: any) => ["BRIGADE_LEADER", "ADMIN"].includes(u.role))
      .map((u: any) => u.id),
    {
      title: "🆕 Нова задача",
      body: `${(task as any).client.name}, ${task.city} · ${formatDateUa(task.dateFrom)}–${formatDateUa(task.dateTo)}`,
      url: `/uk/tasks/${task.id}`,
      tag: `task-${task.id}`,
    }
  ).catch(() => {});
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
      include: {
        brigade: true,
        secondBrigade: true,
        client: true,
        assignees: { select: { name: true } },
      },
      orderBy: { dateFrom: "asc" },
    }),
    prisma.task.findMany({
      where: {
        dateTo: { lt: today },
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
      },
      include: {
        brigade: true,
        secondBrigade: true,
        client: true,
        assignees: { select: { name: true } },
      },
      orderBy: { dateTo: "asc" },
    }),
    prisma.task.findMany({
      where: { status: "ASSIGNED", dateFrom: { gte: today } },
      include: {
        brigade: true,
        secondBrigade: true,
        client: true,
        assignees: { select: { name: true } },
      },
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
          : (task.assignees ?? []).map((a: any) => a.name).join(", ") ||
            `${task.brigade?.name ?? "?"}${task.secondBrigade ? ` + ${task.secondBrigade.name}` : ""}`;
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

/** Меню команд для конкретного чату — залежить від ролі */
export async function setChatMenu(chatId: string, role: string) {
  const bot = getBot();
  if (!bot) return;
  let cmds: { command: string; description: string }[];
  if (role === "BRIGADE_LEADER") {
    cmds = [
      { command: "current", description: "Поточна задача" },
      { command: "tasks", description: "Мої задачі" },
      { command: "archive", description: "Архів задач" },
      { command: "tool", description: "Заявка на інструмент" },
    ];
  } else if (role === "BRIGADE_MEMBER") {
    cmds = [
      { command: "current", description: "Поточна задача" },
      { command: "tasks", description: "Мої задачі" },
      { command: "archive", description: "Архів задач" },
    ];
  } else {
    cmds = [
      { command: "current", description: "Поточна задача" },
      { command: "tasks", description: "Задачі" },
      { command: "archive", description: "Архів задач" },
      { command: "request", description: "Запит на виїзд" },
    ];
  }
  await bot.api
    .setMyCommands(cmds, { scope: { type: "chat", chat_id: Number(chatId) } })
    .catch(() => {});
}

/** Сповіщення бригадиру про результат заявки на інструмент */
export async function notifyToolRequestResolved(requestId: string, status: "DONE" | "REJECTED") {
  const bot = getBot();
  if (!bot) return;
  const req = await prisma.toolRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: true },
  });
  const chat = (req as any)?.requestedBy?.telegramChatId;
  if (!req || !chat) return;
  const lang = langOf((req as any).requestedBy);
  const head = status === "DONE" ? T[lang].toolReqDone : T[lang].toolReqRejected;
  await bot.api
    .sendMessage(chat, `${head}\n${esc(req.text)}`, { parse_mode: "HTML" })
    .catch(() => {});
}

export async function notifyToolRequestCreated(requestId: string) {
  const bot = getBot();
  if (!bot) return;
  const req = await prisma.toolRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: true },
  });
  if (!req) return;
  // нові заявки (і закупка, і видача) спершу йдуть керівнику на погодження
  const roles = ["ADMIN"];
  const recipients = await prisma.user.findMany({
    where: { role: { in: roles as any }, isActive: true, telegramChatId: { not: null } },
  });
  const base = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const tab = req.kind === "PURCHASE" ? "purchase" : "warehouse";
  for (const r of recipients) {
    const lang = langOf(r);
    const title = req.kind === "PURCHASE" ? T[lang].toolBuyTitle : T[lang].toolIssueTitle;
    const lines: string[] = [title, `<b>${esc((req as any).requestedBy?.name ?? "—")}</b>`, "", esc(req.text)];
    if (base) lines.push(`\n${base}/${lang}/tools?tab=${tab}`);
    await bot.api
      .sendMessage(r.telegramChatId!, lines.join("\n"), { parse_mode: "HTML" })
      .catch(() => {});
  }

  sendPushToRoles(["ADMIN"], {
    title: req.kind === "PURCHASE" ? "🛒 Заявка на закупку" : "📦 Заявка на видачу",
    body: req.text.slice(0, 120),
    url: `/uk/tools?tab=${tab}`,
    tag: `treq-${req.id}`,
  }).catch(() => {});
}

/** Погоджена видача: завдання комірникам + підтвердження заявнику */
export async function notifyIssueApproved(requestId: string) {
  const bot = getBot();
  if (!bot) return;
  const req = await prisma.toolRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: true },
  });
  if (!req) return;
  const base = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const keepers = await prisma.user.findMany({
    where: { role: "STOREKEEPER", isActive: true, telegramChatId: { not: null } },
  });
  for (const k of keepers) {
    const lang = langOf(k);
    const lines: string[] = [
      T[lang].toolIssueApprovedTitle,
      `<b>${esc((req as any).requestedBy?.name ?? "—")}</b>`,
      "",
      esc(req.text),
    ];
    if (base) lines.push(`\n${base}/${lang}/tools?tab=warehouse`);
    await bot.api
      .sendMessage(k.telegramChatId!, lines.join("\n"), { parse_mode: "HTML" })
      .catch(() => {});
  }
  const chat = (req as any).requestedBy?.telegramChatId;
  if (chat) {
    const lang = langOf((req as any).requestedBy);
    await bot.api
      .sendMessage(chat, `${T[lang].toolReqApproved}\n${esc(req.text)}`, { parse_mode: "HTML" })
      .catch(() => {});
  }

  sendPushToRoles(["STOREKEEPER"], {
    title: "📦 Погоджена видача",
    body: req.text.slice(0, 120),
    url: "/uk/tools?tab=warehouse",
    tag: `treq-${req.id}`,
  }).catch(() => {});
}

function requestIntroKeyboard(lang: Lang): InlineKeyboard {
  return new InlineKeyboard().text(T[lang].reqBtn, "req:new");
}

async function startRequestDialog(ctx: any, lang: Lang) {
  const chatId = String(ctx.chat!.id);
  await prisma.botDialog.upsert({
    where: { chatId },
    update: { state: JSON.stringify({ flow: "request", step: "serial", lang, data: {} }) },
    create: { chatId, state: JSON.stringify({ flow: "request", step: "serial", lang, data: {} }) },
  });
  await ctx.reply(T[lang].reqAskSerial, {
    reply_markup: new InlineKeyboard().text(T[lang].reqNoSnBtn, "req:nosn"),
  });
}

async function notifyAdminsNewRequest(requestId: string) {
  const bot = getBot();
  if (!bot) return;
  const [req, admins] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { machine: { include: { type: true } }, client: true },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN", isActive: true, telegramChatId: { not: null } },
    }),
  ]);
  if (!req) return;
  const base = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  for (const admin of admins) {
    const lang = langOf(admin);
    const L = T[lang].reqLabels;
    const lines: string[] = [T[lang].reqAdminTitle];
    if ((req as any).machine) {
      lines.push(`<b>${L.model}:</b> ${esc((req as any).machine.model)}`);
      lines.push(`<b>${L.sn}:</b> ${esc(req.serialNumber)}`);
      if ((req as any).client) lines.push(`<b>Клієнт:</b> ${esc((req as any).client.name)}, ${esc((req as any).client.city)}`);
    } else {
      lines.push(`<b>${L.sn}:</b> ${esc(req.serialNumber)}`);
      if (req.machineTypeText) lines.push(`<b>${L.type}:</b> ${esc(req.machineTypeText)}`);
      if (req.modelText) lines.push(`<b>${L.model}:</b> ${esc(req.modelText)}`);
      if (req.contactName) lines.push(`<b>${L.contact}:</b> ${esc(req.contactName)}`);
      if (req.contactPhone) lines.push(`<b>${L.phone}:</b> ${esc(req.contactPhone)}`);
    }
    lines.push(`<b>${L.problem}:</b> ${esc(req.problem)}`);
    if (base) lines.push(`\n${base}/${lang}/requests`);
    await bot.api
      .sendMessage(admin.telegramChatId!, lines.join("\n"), { parse_mode: "HTML" })
      .catch(() => {});
  }

  sendPushToRoles(["ADMIN", "VIEWER"], {
    title: "🆕 Заявка на виїзд",
    body: req.problem.slice(0, 120),
    url: "/uk/requests",
    tag: `sreq-${req.id}`,
  }).catch(() => {});
}

/** Сповіщення заявнику: заявку взято в роботу (створено задачу) */
export async function notifyRequesterAccepted(requestId: string) {
  const bot = getBot();
  if (!bot) return;
  const req = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!req?.chatId) return;
  await bot.api.sendMessage(req.chatId, T.uk.reqAccepted + "\n\n" + T.ru.reqAccepted).catch(() => {});
}

async function handleRequestDialog(ctx: any, dialogState: any) {
  const chatId = String(ctx.chat.id);
  const lang: Lang = dialogState.lang === "ru" ? "ru" : "uk";
  const text = String(ctx.message.text).trim();
  const data = dialogState.data ?? {};

  const save = (step: string, extra: Record<string, unknown>) =>
    prisma.botDialog.update({
      where: { chatId },
      data: {
        state: JSON.stringify({ flow: "request", step, lang, data: { ...data, ...extra } }),
      },
    });

  switch (dialogState.step) {
    case "serial": {
      const machine = await prisma.machine.findFirst({
        where: { serialNumber: { equals: text, mode: "insensitive" } },
        include: { client: true, type: true },
      });
      if (machine) {
        await save("problem", { serial: text, machineId: machine.id, clientId: machine.clientId });
        await ctx.reply(
          `${T[lang].reqFound}\n<b>${esc((machine as any).model)}</b> — ${esc(
            (machine as any).client.name
          )}, ${esc((machine as any).client.city)}\n\n${T[lang].reqAskProblem}`,
          { parse_mode: "HTML" }
        );
      } else {
        await save("typeText", { serial: text });
        await ctx.reply(T[lang].reqNotFound);
      }
      return;
    }
    case "typeText":
      await save("modelText", { typeText: text });
      await ctx.reply(T[lang].reqAskModel);
      return;
    case "modelText":
      await save("contactName", { modelText: text });
      await ctx.reply(T[lang].reqAskName);
      return;
    case "contactName":
      await save("contactPhone", { contactName: text });
      await ctx.reply(T[lang].reqAskPhone, {
        reply_markup: {
          keyboard: [[{ text: T[lang].reqSharePhone, request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return;
    case "contactPhone":
      await save("problem", { contactPhone: text });
      await ctx.reply(T[lang].reqAskProblem, { reply_markup: { remove_keyboard: true } });
      return;
    case "problem": {
      const req = await prisma.serviceRequest.create({
        data: {
          chatId,
          serialNumber: data.serial ?? "",
          machineId: data.machineId ?? null,
          clientId: data.clientId ?? null,
          machineTypeText: data.typeText ?? null,
          modelText: data.modelText ?? null,
          contactName: data.contactName ?? null,
          contactPhone: data.contactPhone ?? null,
          problem: text,
        },
      });
      await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});
      await ctx.reply(T[lang].reqSaved);
      notifyAdminsNewRequest(req.id).catch(() => {});
      return;
    }
    default:
      await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});
  }
}

function registerHandlers(bot: Bot) {
  // /start [код]
  bot.command("start", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const code = (ctx.match ?? "").trim().toUpperCase();

    const existing = await userByChat(chatId);
    await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});

    if (!code) {
      if (existing) {
        await setChatMenu(chatId, existing.role);
        await ctx.reply(T[langOf(existing)].alreadyLinked);
      } else {
        const lang = langFromCtx(ctx);
        await ctx.reply(T[lang].reqIntro, { reply_markup: requestIntroKeyboard(lang) });
      }
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
    await setChatMenu(chatId, user.role);
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
    notifyMembersConfirmed(taskId).catch(() => {});
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

    // фінальні статуси — запитуємо коментар/причину текстом
    if (to === "NOT_DONE" || to === "PARTIALLY_DONE" || to === "DONE") {
      await prisma.user.update({
        where: { id: user.id },
        data: { tgPendingAction: JSON.stringify({ type: "status", status: to, taskId }) },
      });
      await ctx.answerCallbackQuery();
      await ctx.reply(
        to === "NOT_DONE"
          ? T[lang].reasonAsk
          : to === "PARTIALLY_DONE"
            ? T[lang].partialReasonAsk
            : T[lang].doneCommentAsk
      );
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

  // ↩️ Відповісти на питання бригадира
  bot.callbackQuery(/^ans:([^:]+):(.+)$/, async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const taskId = ctx.match![1];
    const toUserId = ctx.match![2];
    const user = await userByChat(chatId);
    if (!user) return ctx.answerCallbackQuery({ text: T.uk.notLinked });
    const lang = langOf(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { tgPendingAction: JSON.stringify({ type: "answer", taskId, toUserId }) },
    });
    await ctx.answerCallbackQuery();
    await ctx.reply(T[lang].answerAsk);
  });

  // Заявка на виїзд: команда та кнопка (доступно всім, включно з неавторизованими)
  bot.command("request", async (ctx) => {
    const user = await userByChat(String(ctx.chat.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await startRequestDialog(ctx, lang);
  });

  bot.callbackQuery("req:new", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await startRequestDialog(ctx, lang);
  });

  // заявка без серійного номера — одразу до ручного опису
  bot.callbackQuery("req:nosn", async (ctx) => {
    await ctx.answerCallbackQuery();
    const chatId = String(ctx.chat!.id);
    const dialog = await prisma.botDialog.findUnique({ where: { chatId } });
    let lang: Lang = langFromCtx(ctx);
    try {
      const st = dialog ? JSON.parse(dialog.state) : null;
      if (st?.lang) lang = st.lang;
    } catch {}
    await prisma.botDialog.upsert({
      where: { chatId },
      update: {
        state: JSON.stringify({ flow: "request", step: "typeText", lang, data: { serial: "" } }),
      },
      create: {
        chatId,
        state: JSON.stringify({ flow: "request", step: "typeText", lang, data: { serial: "" } }),
      },
    });
    await ctx.reply(T[lang].reqNotFound);
  });

  // Єдина кнопка "Заявка на інструмент": вибір типу
  bot.command("tool", async (ctx) => {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) {
      const lang = langFromCtx(ctx);
      return ctx.reply(T[lang].reqIntro, { reply_markup: requestIntroKeyboard(lang) });
    }
    const lang = langOf(user);
    if (user.role !== "BRIGADE_LEADER" && user.role !== "ADMIN") {
      return ctx.reply(T[lang].onlyLeaders);
    }
    await ctx.reply(T[lang].toolAskKind, {
      reply_markup: new InlineKeyboard()
        .text(T[lang].toolKindBuy, "toolreq:PURCHASE")
        .text(T[lang].toolKindIssue, "toolreq:ISSUE"),
    });
  });

  bot.callbackQuery(/^toolreq:(PURCHASE|ISSUE)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    if (!user) return;
    const lang = langOf(user);
    if (user.role !== "BRIGADE_LEADER" && user.role !== "ADMIN") {
      return ctx.reply(T[lang].onlyLeaders);
    }
    const kind = ctx.match![1] as "PURCHASE" | "ISSUE";
    await prisma.user.update({
      where: { id: user.id },
      data: { tgPendingAction: JSON.stringify({ type: "toolreq", kind }) },
    });
    await ctx.reply(kind === "PURCHASE" ? T[lang].toolBuyAsk : T[lang].toolIssueAsk);
  });

  // Заявки на інструмент (лише бригадири)
  for (const [cmd, kind] of [
    ["toolbuy", "PURCHASE"],
    ["toolissue", "ISSUE"],
  ] as const) {
    bot.command(cmd, async (ctx) => {
      const user = await userByChat(String(ctx.chat.id));
      if (!user) {
        const lang = langFromCtx(ctx);
        return ctx.reply(T[lang].reqIntro, { reply_markup: requestIntroKeyboard(lang) });
      }
      const lang = langOf(user);
      if (user.role !== "BRIGADE_LEADER" && user.role !== "ADMIN") {
        return ctx.reply(T[lang].onlyLeaders);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { tgPendingAction: JSON.stringify({ type: "toolreq", kind }) },
      });
      await ctx.reply(kind === "PURCHASE" ? T[lang].toolBuyAsk : T[lang].toolIssueAsk);
    });
  }

  // Меню: /tasks — актуальні та майбутні
  bot.command("tasks", async (ctx) => {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) {
      const lang = langFromCtx(ctx);
      return ctx.reply(T[lang].reqIntro, { reply_markup: requestIntroKeyboard(lang) });
    }
    const lang = langOf(user);
    const tasks = await prisma.task.findMany({
      where: {
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
        ...assigneeWhere(user),
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
    if (!user) {
      const lang = langFromCtx(ctx);
      return ctx.reply(T[lang].reqIntro, { reply_markup: requestIntroKeyboard(lang) });
    }
    const lang = langOf(user);
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
        ...assigneeWhere(user),
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
    if (!user) {
      const lang = langFromCtx(ctx);
      return ctx.reply(T[lang].reqIntro, { reply_markup: requestIntroKeyboard(lang) });
    }
    const lang = langOf(user);
    const today = kyivToday();

    const includeFull = {
      client: { include: { contacts: true } },
      machines: true,
      invoice: true,
      brigade: true,
      secondBrigade: true,
      assignees: { select: { name: true } },
    } as const;

    // 1) усі активні зараз (В дорозі / На об'єкті, сьогодні в діапазоні) — може бути кілька
    let tasks = await prisma.task.findMany({
      where: {
        status: { in: ["EN_ROUTE", "ON_SITE"] },
        dateFrom: { lte: today },
        dateTo: { gte: today },
        ...assigneeWhere(user),
      },
      include: includeFull,
      orderBy: { dateTo: "asc" },
      take: 3,
    });
    // 2) інакше — найближча незавершена
    if (tasks.length === 0) {
      const next = await prisma.task.findFirst({
        where: {
          status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
          dateTo: { gte: today },
          ...assigneeWhere(user),
        },
        include: includeFull,
        orderBy: { dateFrom: "asc" },
      });
      if (next) tasks = [next];
    }
    if (tasks.length === 0) return ctx.reply(T[lang].noCurrent);

    const isMember = user.role === "BRIGADE_MEMBER";
    for (const task of tasks) {
      await ctx.reply(
        `${T[lang].current}\n${taskCard(lang, task)}\n\n${contactsBlock(lang, task.client.contacts)}`,
        {
          parse_mode: "HTML",
          reply_markup: isMember
            ? undefined
            : task.status === "ASSIGNED"
              ? acceptKeyboard(lang, task.id)
              : statusKeyboard(lang, task.id, task.status as TaskStatusValue),
        }
      );
    }
  });

  // Поділитися контактом (кнопка на кроці телефону в заявці)
  bot.on("message:contact", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const dialog = await prisma.botDialog.findUnique({ where: { chatId } });
    if (!dialog) return;
    let st: any = null;
    try {
      st = JSON.parse(dialog.state);
    } catch {}
    if (st?.flow !== "request" || st?.step !== "contactPhone") return;
    const lang: Lang = st.lang === "ru" ? "ru" : "uk";
    const phone = ctx.message.contact.phone_number;
    await prisma.botDialog.update({
      where: { chatId },
      data: {
        state: JSON.stringify({
          flow: "request",
          step: "problem",
          lang,
          data: { ...(st.data ?? {}), contactPhone: phone },
        }),
      },
    });
    await ctx.reply(T[lang].reqAskProblem, { reply_markup: { remove_keyboard: true } });
  });

  // Текстові повідомлення: діалог заявки / причина / питання / відповідь
  bot.on("message:text", async (ctx) => {
    const chatId = String(ctx.chat.id);

    // покроковий діалог заявки має пріоритет
    const dialog = await prisma.botDialog.findUnique({ where: { chatId } });
    if (dialog) {
      let st: any = null;
      try {
        st = JSON.parse(dialog.state);
      } catch {}
      if (st?.flow === "request") return handleRequestDialog(ctx, st);
      await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});
    }

    const user = await userByChat(chatId);
    if (!user) {
      const lang = langFromCtx(ctx);
      return ctx.reply(T[lang].reqIntro, { reply_markup: requestIntroKeyboard(lang) });
    }
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

    if (pending.type === "toolreq") {
      const req = await prisma.toolRequest.create({
        data: { kind: pending.kind, text, requestedById: user.id },
      });
      await ctx.reply(T[lang].toolReqSaved);
      notifyToolRequestCreated(req.id).catch(() => {});
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

      // зберігаємо питання в обговоренні задачі
      await prisma.taskComment.create({
        data: { taskId: pending.taskId, userId: user.id, kind: "QUESTION", text },
      });

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
            {
              parse_mode: "HTML",
              reply_markup: new InlineKeyboard().text(
                T[alang].btnReply,
                `ans:${pending.taskId}:${user.id}`
              ),
            }
          )
          .catch(() => {});
      }
      await ctx.reply(T[lang].questionSent);
      return;
    }

    if (pending.type === "answer") {
      const target = await prisma.user.findUnique({ where: { id: pending.toUserId } });

      // зберігаємо відповідь в обговоренні задачі
      await prisma.taskComment.create({
        data: { taskId: pending.taskId, userId: user.id, kind: "ANSWER", text },
      });

      if (target?.telegramChatId) {
        const tlang = langOf(target);
        const bot2 = getBot()!;
        await bot2.api
          .sendMessage(
            target.telegramChatId,
            `${T[tlang].answerFrom} (${esc(user.name)}):\n\n${esc(text)}`,
            { parse_mode: "HTML" }
          )
          .catch(() => {});
      }
      await ctx.reply(T[lang].answerSent);
      return;
    }
  });
}

/** Сповіщення про новий коментар з веб-інтерфейсу: адмін ↔ бригадири задачі */
export async function notifyTaskComment(taskId: string, authorId: string, text: string) {
  const bot = getBot();
  if (!bot) return;
  const [task, author] = await Promise.all([
    prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: true,
        brigade: { include: { users: { where: { role: "BRIGADE_LEADER", isActive: true } } } },
        secondBrigade: {
          include: { users: { where: { role: "BRIGADE_LEADER", isActive: true } } },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: authorId } }),
  ]);
  if (!task || !author) return;

  let recipients: any[];
  if (author.role === "BRIGADE_LEADER") {
    recipients = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true, telegramChatId: { not: null } },
    });
  } else {
    recipients = [
      ...(task.brigade?.users ?? []),
      ...(task.secondBrigade?.users ?? []),
    ].filter((u: any) => u.telegramChatId && u.id !== author.id);
  }

  for (const r of recipients) {
    const lang = langOf(r);
    const f = T[lang].fields;
    await bot.api
      .sendMessage(
        r.telegramChatId!,
        `${T[lang].commentFrom}\n<b>${esc(author.name)}</b>\n<b>${f.task}:</b> ${esc(
          task.client.name
        )}, ${esc(task.city)}\n\n${esc(text)}`,
        { parse_mode: "HTML" }
      )
      .catch(() => {});
  }

  sendPushToUsers(
    recipients.map((r: any) => r.id),
    {
      title: `💬 ${author.name}`,
      body: text.slice(0, 120),
      url: `/uk/tasks/${taskId}`,
      tag: `task-${taskId}`,
    }
  ).catch(() => {});
}

/**
 * Після підтвердження задачі бригадиром — інформаційна картка
 * працівникам бригади (без кнопок: статуси змінює лише бригадир).
 */
export async function notifyMembersConfirmed(taskId: string) {
  const bot = getBot();
  if (!bot) return;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      client: { include: { contacts: true } },
      machines: true,
      invoice: true,
      brigade: true,
      secondBrigade: true,
      assignees: { where: { isActive: true } },
    },
  });
  if (!task) return;
  for (const member of (task as any).assignees) {
    if (member.role !== "BRIGADE_MEMBER") continue;
    if (!member.telegramChatId) continue;
    const lang = langOf(member);
    await bot.api
      .sendMessage(
        member.telegramChatId,
        `${taskCard(lang, task)}\n\n${contactsBlock(lang, (task as any).client.contacts)}`,
        { parse_mode: "HTML" }
      )
      .catch(() => {});
  }

  sendPushToUsers(
    (task as any).assignees.map((u: any) => u.id),
    {
      title: "✅ Задачу підтверджено",
      body: `${(task as any).client.name}, ${task.city}`,
      url: `/uk/tasks/${task.id}`,
      tag: `task-${task.id}`,
    }
  ).catch(() => {});
}
