import { Bot, InlineKeyboard, InputFile, webhookCallback } from "grammy";
import { prisma } from "@/lib/prisma";
import { applyStatusChange } from "@/lib/taskService";
import { nextStatusesFor, type TaskStatusValue } from "@/lib/taskStatus";
import { formatDateUa, kyivToday, isOverdue } from "@/lib/dates";
import { warrantyEnd, DEFAULT_COMMISSIONING } from "@/lib/warranty";
import { saveTaskFile } from "@/lib/uploads";
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
    roleMenuPrompt: "Оберіть, хто ви:",
    btnClient: "🙋 Я клієнт",
    btnStaff: "👷 Я співробітник",
    clientMenuPrompt: "Оберіть дію:",
    btnService: "🛠 Заявка на обслуговування",
    btnMachineInfo: "ℹ️ Інформація про верстат",
    btnHistory: "📜 Історія",
    btnContact: "☎️ Зв'язатися з компанією",
    notLinkedStaff:
      "На жаль, цей номер не пов'язаний з жодним акаунтом. Зверніться до адміністратора.",
    btnStaffCurrent: "📍 Поточна задача",
    btnStaffTasks: "📋 Мої задачі",
    btnStaffHistory: "📜 Історія верстата",
    btnStaffToolBuy: "🛒 Заявка на закупку",
    btnStaffToolIssue: "📦 Заявка на видачу",
    askSerialInfo: "Введіть серійний номер верстата з шильда:",
    askSerialHistory: "Введіть серійний номер верстата з шильда:",
    machineInfoHeader: "ℹ️ <b>Інформація про верстат</b>",
    machineInfoClient: "Клієнт",
    machineInfoMachine: "Верстат",
    machineInfoLaunch: "Дата запуску",
    machineInfoWarranty: "Гарантія до",
    machineNotFound:
      "Верстат із таким серійним номером не знайдено в базі. Зверніться до сервісної служби.",
    historyHeader: "📜 <b>Історія виїздів</b>",
    historyEmpty: "Виїздів по цьому верстату ще не було.",
    historyNoteLabel: "Примітка",
    historyReportLabel: "Звіт",
    historyExecutorsLabel: "Виконавці",
    backToMenu: "⬅️ Головне меню",
    mediaSaved: "📎 Файл збережено у звіті задачі.",
    mediaNoPending:
      "Щоб додати фото/відео до звіту, спершу оберіть статус задачі, а потім надішліть файли з підписом.",
    mediaTooBig: "Файл завеликий для Telegram-бота (ліміт 20 МБ). Завантажте через веб-портал.",
    btnStaffAct: "📄 Акт виконаних робіт",
    actPickTask: "Оберіть задачу для акта:",
    actNoTasks: "Немає завершених задач для формування акта.",
    actGenerating: "⏳ Формую акт — це може зайняти до пів хвилини…",
    actEmpty: "У задачі немає підсумку робіт — спершу закрийте задачу з коментарем.",
    actError: "Не вдалося сформувати акт. Спробуйте пізніше.",
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
    roleMenuPrompt: "Выберите, кто вы:",
    btnClient: "🙋 Я клиент",
    btnStaff: "👷 Я сотрудник",
    clientMenuPrompt: "Выберите действие:",
    btnService: "🛠 Заявка на обслуживание",
    btnMachineInfo: "ℹ️ Информация о станке",
    btnHistory: "📜 История",
    btnContact: "☎️ Связаться с компанией",
    notLinkedStaff:
      "К сожалению, этот номер не привязан ни к одному аккаунту. Обратитесь к администратору.",
    btnStaffCurrent: "📍 Текущая задача",
    btnStaffTasks: "📋 Мои задачи",
    btnStaffHistory: "📜 История станка",
    btnStaffToolBuy: "🛒 Заявка на закупку",
    btnStaffToolIssue: "📦 Заявка на выдачу",
    askSerialInfo: "Введите серийный номер станка с шильда:",
    askSerialHistory: "Введите серийный номер станка с шильда:",
    machineInfoHeader: "ℹ️ <b>Информация о станке</b>",
    machineInfoClient: "Клиент",
    machineInfoMachine: "Станок",
    machineInfoLaunch: "Дата запуска",
    machineInfoWarranty: "Гарантия до",
    machineNotFound:
      "Станок с таким серийным номером не найден в базе. Обратитесь в сервисную службу.",
    historyHeader: "📜 <b>История выездов</b>",
    historyEmpty: "Выездов по этому станку ещё не было.",
    historyNoteLabel: "Примечание",
    historyReportLabel: "Отчёт",
    historyExecutorsLabel: "Исполнители",
    backToMenu: "⬅️ Главное меню",
    mediaSaved: "📎 Файл сохранён в отчёте задачи.",
    mediaNoPending:
      "Чтобы добавить фото/видео к отчёту, сначала выберите статус задачи, затем отправьте файлы с подписью.",
    mediaTooBig: "Файл слишком большой для Telegram-бота (лимит 20 МБ). Загрузите через веб-портал.",
    btnStaffAct: "📄 Акт выполненных работ",
    actPickTask: "Выберите задачу для акта:",
    actNoTasks: "Нет завершённых задач для формирования акта.",
    actGenerating: "⏳ Формирую акт — это может занять до полминуты…",
    actEmpty: "В задаче нет итога работ — сначала закройте задачу с комментарием.",
    actError: "Не удалось сформировать акт. Попробуйте позже.",
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
      { command: "menu", description: "Головне меню" },
      { command: "current", description: "Поточна задача" },
      { command: "tasks", description: "Мої задачі" },
      { command: "archive", description: "Архів задач" },
      { command: "tool", description: "Заявка на інструмент" },
    ];
  } else if (role === "BRIGADE_MEMBER") {
    cmds = [
      { command: "menu", description: "Головне меню" },
      { command: "current", description: "Поточна задача" },
      { command: "tasks", description: "Мої задачі" },
      { command: "archive", description: "Архів задач" },
    ];
  } else if (role === "STOREKEEPER") {
    cmds = [{ command: "menu", description: "Головне меню" }];
  } else {
    cmds = [
      { command: "menu", description: "Головне меню" },
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

/** Сповіщення про заявку на запуск верстата (публічна форма менеджерів) */
export async function notifyLaunchRequest(requestId: string) {
  const bot = getBot();
  if (!bot) return;
  const req = await prisma.launchRequest.findUnique({
    where: { id: requestId },
    include: { manager: true },
  });
  if (!req) return;
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, telegramChatId: { not: null } },
  });
  const base = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  for (const admin of admins) {
    const lang = langOf(admin);
    const title =
      lang === "ru"
        ? "🏭 <b>Заявка на запуск станка</b>"
        : "🏭 <b>Заявка на запуск верстата</b>";
    const lines: string[] = [title];
    if ((req as any).manager) lines.push(`<b>Менеджер:</b> ${esc((req as any).manager.name)}`);
    lines.push(`<b>Клієнт:</b> ${esc(req.clientName)}`);
    if (req.contactInfo) lines.push(`<b>Контакт:</b> ${esc(req.contactInfo)}`);
    if (req.city) lines.push(`<b>Місто:</b> ${esc(req.city)}`);
    lines.push(`<b>Верстат:</b> ${esc(req.machineText)}`);
    if (req.desiredDate) lines.push(`<b>Бажана дата:</b> ${formatDateUa(req.desiredDate)}`);
    if (req.note) lines.push(`<b>Примітка:</b> ${esc(req.note)}`);
    if (base) lines.push(`\n${base}/${lang}/requests?tab=launch`);
    await bot.api
      .sendMessage(admin.telegramChatId!, lines.join("\n"), { parse_mode: "HTML" })
      .catch(() => {});
  }

  sendPushToRoles(["ADMIN", "VIEWER"], {
    title: "🏭 Заявка на запуск верстата",
    body: `${req.clientName} · ${req.machineText}`.slice(0, 120),
    url: "/uk/requests?tab=launch",
    tag: `launch-${req.id}`,
  }).catch(() => {});
}

/** Головна точка входу: "Я клієнт" / "Я співробітник" */
async function showRoleMenu(ctx: any, lang: Lang) {
  await prisma.botDialog.delete({ where: { chatId: String(ctx.chat.id) } }).catch(() => {});
  await ctx.reply(T[lang].roleMenuPrompt, {
    reply_markup: new InlineKeyboard()
      .text(T[lang].btnClient, "menu:client")
      .row()
      .text(T[lang].btnStaff, "menu:staff"),
  });
}

function clientMenuKeyboard(lang: Lang): InlineKeyboard {
  return new InlineKeyboard()
    .text(T[lang].btnService, "creq:service")
    .row()
    .text(T[lang].btnMachineInfo, "creq:info")
    .row()
    .text(T[lang].btnHistory, "creq:history")
    .row()
    .text(T[lang].btnContact, "creq:contact");
}

function staffMenuKeyboard(lang: Lang, role: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(T[lang].btnStaffCurrent, "staff:current")
    .row()
    .text(T[lang].btnStaffTasks, "staff:tasks")
    .row()
    .text(T[lang].btnStaffHistory, "staff:history");
  if (role === "BRIGADE_LEADER" || role === "ADMIN") {
    kb.row()
      .text(T[lang].btnStaffAct, "staff:act")
      .row()
      .text(T[lang].btnStaffToolBuy, "staff:toolbuy")
      .row()
      .text(T[lang].btnStaffToolIssue, "staff:toolissue");
  }
  return kb;
}

function contactText(lang: Lang): string {
  const envText =
    lang === "ru" ? process.env.COMPANY_CONTACT_RU : process.env.COMPANY_CONTACT_UK;
  if (envText) return envText;
  return lang === "ru"
    ? "СТАН КОМПЛЕКТ\nТел.: +380 44 000 00 00\nEmail: service@stan-komplekt.ua"
    : "СТАН КОМПЛЕКТ\nТел.: +380 44 000 00 00\nEmail: service@stan-komplekt.ua";
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

async function startMachineInfoDialog(ctx: any, lang: Lang) {
  const chatId = String(ctx.chat.id);
  await prisma.botDialog.upsert({
    where: { chatId },
    update: { state: JSON.stringify({ flow: "minfo", step: "serial", lang, data: {} }) },
    create: { chatId, state: JSON.stringify({ flow: "minfo", step: "serial", lang, data: {} }) },
  });
  await ctx.reply(T[lang].askSerialInfo);
}

async function handleMachineInfoDialog(ctx: any, state: any) {
  const chatId = String(ctx.chat.id);
  const lang: Lang = state.lang === "ru" ? "ru" : "uk";
  const serial = String(ctx.message.text).trim();
  await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});

  const machine = await prisma.machine.findFirst({
    where: { serialNumber: { equals: serial, mode: "insensitive" } },
    include: { client: true },
  });
  if (!machine) {
    await ctx.reply(T[lang].machineNotFound);
    return;
  }
  const lastPnr = await prisma.task.findFirst({
    where: { machines: { some: { id: machine.id } }, taskType: "PNR", status: "DONE" },
    orderBy: { dateTo: "desc" },
  });
  const commissioning = lastPnr ? lastPnr.dateTo : DEFAULT_COMMISSIONING;
  const wEnd = warrantyEnd(commissioning, (machine as any).warrantyMonths);

  const lines = [
    T[lang].machineInfoHeader,
    `<b>${T[lang].machineInfoClient}:</b> ${esc((machine as any).client.name)}`,
    `<b>${T[lang].machineInfoMachine}:</b> ${esc((machine as any).model)}`,
    `<b>${T[lang].machineInfoLaunch}:</b> ${formatDateUa(commissioning)}`,
    `<b>${T[lang].machineInfoWarranty}:</b> ${formatDateUa(wEnd)}`,
  ];
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

async function startClientHistoryDialog(ctx: any, lang: Lang) {
  const chatId = String(ctx.chat.id);
  await prisma.botDialog.upsert({
    where: { chatId },
    update: { state: JSON.stringify({ flow: "chistory", step: "serial", lang, data: {} }) },
    create: { chatId, state: JSON.stringify({ flow: "chistory", step: "serial", lang, data: {} }) },
  });
  await ctx.reply(T[lang].askSerialHistory);
}

async function handleClientHistoryDialog(ctx: any, state: any) {
  const chatId = String(ctx.chat.id);
  const lang: Lang = state.lang === "ru" ? "ru" : "uk";
  const serial = String(ctx.message.text).trim();
  await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});

  const machine = await prisma.machine.findFirst({
    where: { serialNumber: { equals: serial, mode: "insensitive" } },
  });
  if (!machine) {
    await ctx.reply(T[lang].machineNotFound);
    return;
  }
  const tasks = await prisma.task.findMany({
    where: {
      machines: { some: { id: machine.id } },
      status: { in: ["DONE", "PARTIALLY_DONE"] },
    },
    orderBy: { dateTo: "desc" },
    take: 10,
  });
  if (tasks.length === 0) {
    await ctx.reply(`${T[lang].historyHeader}\n${T[lang].historyEmpty}`, { parse_mode: "HTML" });
    return;
  }
  const lines = tasks.map(
    (tk: any) =>
      `${formatDateUa(tk.dateFrom)} — ${esc(tk.note?.trim() || tk.failureReason?.trim() || "—")}`
  );
  await ctx.reply(`${T[lang].historyHeader}\n${lines.join("\n")}`, { parse_mode: "HTML" });
}

async function startStaffHistoryDialog(ctx: any, lang: Lang) {
  const chatId = String(ctx.chat.id);
  await prisma.botDialog.upsert({
    where: { chatId },
    update: { state: JSON.stringify({ flow: "shistory", step: "serial", lang, data: {} }) },
    create: { chatId, state: JSON.stringify({ flow: "shistory", step: "serial", lang, data: {} }) },
  });
  await ctx.reply(T[lang].askSerialHistory);
}

async function handleStaffHistoryDialog(ctx: any, state: any) {
  const chatId = String(ctx.chat.id);
  const lang: Lang = state.lang === "ru" ? "ru" : "uk";
  const serial = String(ctx.message.text).trim();
  await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});

  const machine = await prisma.machine.findFirst({
    where: { serialNumber: { equals: serial, mode: "insensitive" } },
  });
  if (!machine) {
    await ctx.reply(T[lang].machineNotFound);
    return;
  }
  const tasks = await prisma.task.findMany({
    where: { machines: { some: { id: machine.id } } },
    include: { assignees: { select: { name: true } }, brigade: true, secondBrigade: true },
    orderBy: { dateFrom: "desc" },
    take: 10,
  });
  if (tasks.length === 0) {
    await ctx.reply(`${T[lang].historyHeader}\n${T[lang].historyEmpty}`, { parse_mode: "HTML" });
    return;
  }
  const blocks = tasks.map((tk: any) => {
    const executors =
      tk.assignees.map((a: any) => a.name).join(", ") ||
      [tk.brigade?.name, tk.secondBrigade?.name].filter(Boolean).join(" + ") ||
      "—";
    const rows = [
      `<b>${formatDateUa(tk.dateFrom)} — ${formatDateUa(tk.dateTo)}</b>`,
      `${T[lang].historyExecutorsLabel}: ${esc(executors)}`,
    ];
    if (tk.note?.trim()) rows.push(`${T[lang].historyNoteLabel}: ${esc(tk.note.trim())}`);
    if (tk.failureReason?.trim()) rows.push(`${T[lang].historyReportLabel}: ${esc(tk.failureReason.trim())}`);
    return rows.join("\n");
  });
  await ctx.reply(`${T[lang].historyHeader}\n\n${blocks.join("\n\n")}`, { parse_mode: "HTML" });
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

  async function runCurrentCommand(ctx: any) {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) {
      const lang = langFromCtx(ctx);
      return showRoleMenu(ctx, lang);
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
  }

  async function runTasksCommand(ctx: any) {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) {
      const lang = langFromCtx(ctx);
      return showRoleMenu(ctx, lang);
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
  }

  async function runArchiveCommand(ctx: any) {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) {
      const lang = langFromCtx(ctx);
      return showRoleMenu(ctx, lang);
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
  }

  async function runToolReqPrompt(ctx: any, kind: "PURCHASE" | "ISSUE") {
    const user = await userByChat(String(ctx.chat.id));
    if (!user) {
      const lang = langFromCtx(ctx);
      return showRoleMenu(ctx, lang);
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
  }

function registerHandlers(bot: Bot) {
  // /start [код]
  bot.command("start", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const code = (ctx.match ?? "").trim().toUpperCase();

    const existing = await userByChat(chatId);
    await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});

    if (!code) {
      const lang = existing ? langOf(existing) : langFromCtx(ctx);
      if (existing) await setChatMenu(chatId, existing.role);
      await showRoleMenu(ctx, lang);
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
      return showRoleMenu(ctx, lang);
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
    const kind = ctx.match![1] as "PURCHASE" | "ISSUE";
    await runToolReqPrompt(ctx, kind);
  });

  // Заявки на інструмент (лише бригадири)
  for (const [cmd, kind] of [
    ["toolbuy", "PURCHASE"],
    ["toolissue", "ISSUE"],
  ] as const) {
    bot.command(cmd, (ctx) => runToolReqPrompt(ctx, kind));
  }

  // Головне меню: "Я клієнт" / "Я співробітник"
  bot.command("menu", async (ctx) => {
    const user = await userByChat(String(ctx.chat.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await showRoleMenu(ctx, lang);
  });

  bot.callbackQuery("menu:client", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await ctx.reply(T[lang].clientMenuPrompt, { reply_markup: clientMenuKeyboard(lang) });
  });

  bot.callbackQuery("menu:staff", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    if (!user) {
      await ctx.reply(T[lang].notLinkedStaff);
      return;
    }
    await ctx.reply(T[lang].clientMenuPrompt, {
      reply_markup: staffMenuKeyboard(lang, user.role),
    });
  });

  bot.callbackQuery("creq:service", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await startRequestDialog(ctx, lang);
  });

  bot.callbackQuery("creq:info", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await startMachineInfoDialog(ctx, lang);
  });

  bot.callbackQuery("creq:history", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await startClientHistoryDialog(ctx, lang);
  });

  bot.callbackQuery("creq:contact", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    const lang = user ? langOf(user) : langFromCtx(ctx);
    await ctx.reply(contactText(lang));
  });

  bot.callbackQuery("staff:current", async (ctx) => {
    await ctx.answerCallbackQuery();
    await runCurrentCommand(ctx);
  });

  bot.callbackQuery("staff:tasks", async (ctx) => {
    await ctx.answerCallbackQuery();
    await runTasksCommand(ctx);
  });

  bot.callbackQuery("staff:history", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    if (!user) return;
    await startStaffHistoryDialog(ctx, langOf(user));
  });

  bot.callbackQuery("staff:act", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    if (!user) return;
    const lang = langOf(user);
    if (user.role !== "BRIGADE_LEADER" && user.role !== "ADMIN") {
      return ctx.reply(T[lang].onlyLeaders);
    }
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ["DONE", "PARTIALLY_DONE"] },
        ...(user.role === "ADMIN" ? {} : { assignees: { some: { id: user.id } } }),
      },
      include: { client: true },
      orderBy: { dateTo: "desc" },
      take: 8,
    });
    if (tasks.length === 0) return ctx.reply(T[lang].actNoTasks);
    const kb = new InlineKeyboard();
    for (const tk of tasks as any[]) {
      kb.text(
        `${formatDateUa(tk.dateTo)} · ${tk.client.name.slice(0, 28)}`,
        `act:${tk.id}`
      ).row();
    }
    await ctx.reply(T[lang].actPickTask, { reply_markup: kb });
  });

  bot.callbackQuery(/^act:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await userByChat(String(ctx.chat!.id));
    if (!user) return;
    const lang = langOf(user);
    if (user.role !== "BRIGADE_LEADER" && user.role !== "ADMIN") {
      return ctx.reply(T[lang].onlyLeaders);
    }
    const taskId = ctx.match![1];
    if (user.role !== "ADMIN") {
      const allowed = await prisma.task.findFirst({
        where: { id: taskId, assignees: { some: { id: user.id } } },
        select: { id: true },
      });
      if (!allowed) return;
    }
    await ctx.reply(T[lang].actGenerating);
    try {
      const { generateTaskReportPdf } = await import("@/lib/actReport");
      const result = await generateTaskReportPdf(taskId, { byUserId: user.id });
      if ("error" in result) {
        return ctx.reply(result.error === "EMPTY_REPORT" ? T[lang].actEmpty : T[lang].actError);
      }
      await ctx.replyWithDocument(new InputFile(result.buffer, result.fileName));
    } catch {
      await ctx.reply(T[lang].actError);
    }
  });

  bot.callbackQuery("staff:toolbuy", async (ctx) => {
    await ctx.answerCallbackQuery();
    await runToolReqPrompt(ctx, "PURCHASE");
  });

  bot.callbackQuery("staff:toolissue", async (ctx) => {
    await ctx.answerCallbackQuery();
    await runToolReqPrompt(ctx, "ISSUE");
  });

  // Меню: /tasks — актуальні та майбутні
  bot.command("tasks", (ctx) => runTasksCommand(ctx));

  // Меню: /archive — завершені задачі бригадира
  bot.command("archive", (ctx) => runArchiveCommand(ctx));

  // Меню: /current — поточна задача (картка + кнопки статусів)
  bot.command("current", (ctx) => runCurrentCommand(ctx));

  // Поділитися контактом (кнопка на кроці телефону в заявці)
  // Фото/відео до звіту: працює під час очікування коментаря статусу
  // (обрано фінальний статус → бот чекає підсумок) або одразу після — файл із
  // підписом застосовує статус, файл без pending лягає до останньої активної задачі.
  async function handleMedia(ctx: any, kind: "photo" | "video") {
    const chatId = String(ctx.chat.id);
    const user = await userByChat(chatId);
    if (!user) return;
    const lang = langOf(user);

    let pending: any = null;
    try {
      pending = user.tgPendingAction ? JSON.parse(user.tgPendingAction) : null;
    } catch {}

    // цільова задача: з pending-статусу або остання активна задача виконавця
    let taskId: string | null = pending?.type === "status" ? pending.taskId : null;
    if (!taskId) {
      const lastActive = await prisma.task.findFirst({
        where: {
          assignees: { some: { id: user.id } },
          status: { in: ["CONFIRMED", "EN_ROUTE", "ON_SITE", "DONE", "PARTIALLY_DONE"] },
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      taskId = lastActive?.id ?? null;
    }
    if (!taskId) return ctx.reply(T[lang].mediaNoPending);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return;

    const media =
      kind === "photo"
        ? ctx.message.photo[ctx.message.photo.length - 1]
        : ctx.message.video;
    if (!media) return;
    if ((media.file_size ?? 0) > 20 * 1024 * 1024) {
      return ctx.reply(T[lang].mediaTooBig);
    }

    try {
      const file = await ctx.api.getFile(media.file_id);
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("download failed");
      const buffer = Buffer.from(await res.arrayBuffer());
      const origName =
        kind === "photo"
          ? `photo_${media.file_unique_id}.jpg`
          : (ctx.message.video?.file_name ?? `video_${media.file_unique_id}.mp4`);
      const mime = kind === "photo" ? "image/jpeg" : ctx.message.video?.mime_type ?? "video/mp4";

      const { relPath, fileName, size } = await saveTaskFile(
        task.id,
        task.dateFrom,
        origName,
        buffer,
        mime
      );
      await prisma.taskAttachment.create({
        data: { taskId: task.id, fileName, filePath: relPath, mimeType: mime, size, byUserId: user.id },
      });
    } catch {
      return ctx.reply(T[lang].mediaTooBig);
    }

    const caption = ctx.message.caption?.trim();
    // якщо чекали підсумок статусу і є підпис — застосовуємо статус цим підписом
    if (pending?.type === "status" && caption) {
      await prisma.user.update({ where: { id: user.id }, data: { tgPendingAction: null } });
      const result = await applyStatusChange({
        taskId: pending.taskId,
        to: pending.to,
        actor: { id: user.id, role: user.role, brigadeId: user.brigadeId },
        source: "TELEGRAM",
        reason: caption,
      });
      if (!("error" in result)) {
        await ctx.reply(`${T[lang].statusSet} ${statusLabel(lang, pending.to)}`);
        return;
      }
    }
    await ctx.reply(T[lang].mediaSaved);
  }

  bot.on("message:photo", (ctx) => handleMedia(ctx, "photo"));
  bot.on("message:video", (ctx) => handleMedia(ctx, "video"));

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

    // покроковий діалог (заявка / інфо про верстат / історія) має пріоритет
    const dialog = await prisma.botDialog.findUnique({ where: { chatId } });
    if (dialog) {
      let st: any = null;
      try {
        st = JSON.parse(dialog.state);
      } catch {}
      if (st?.flow === "request") return handleRequestDialog(ctx, st);
      if (st?.flow === "minfo") return handleMachineInfoDialog(ctx, st);
      if (st?.flow === "chistory") return handleClientHistoryDialog(ctx, st);
      if (st?.flow === "shistory") return handleStaffHistoryDialog(ctx, st);
      await prisma.botDialog.delete({ where: { chatId } }).catch(() => {});
    }

    const user = await userByChat(chatId);
    if (!user) {
      const lang = langFromCtx(ctx);
      return showRoleMenu(ctx, lang);
    }
    const lang = langOf(user);

    if (!user.tgPendingAction) return showRoleMenu(ctx, lang);

    let pending: any;
    try {
      pending = JSON.parse(user.tgPendingAction);
    } catch {
      pending = null;
    }
    await prisma.user.update({ where: { id: user.id }, data: { tgPendingAction: null } });
    if (!pending) return showRoleMenu(ctx, lang);

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
