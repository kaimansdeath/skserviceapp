/**
 * Seed: первинні дані для ТОВ «СТАН КОМПЛЕКТ»
 * Паролі можна перевизначити через env: SEED_ADMIN_PASSWORD, SEED_VIEWER_PASSWORD, SEED_BRIGADIER_PASSWORD
 */
import { PrismaClient, Role, TaskStatus, LogSource } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin_2026!";
const VIEWER_PASSWORD = process.env.SEED_VIEWER_PASSWORD ?? "Director_2026!";
const ACCOUNTANT_PASSWORD = process.env.SEED_ACCOUNTANT_PASSWORD ?? "Account_2026!";
const BRIGADIER_PASSWORD = process.env.SEED_BRIGADIER_PASSWORD ?? "Brigade_2026!";

function hash(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

/** Дата (00:00) з відступом у днях від сьогодні, для полів @db.Date */
function day(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

async function main() {
  // --- Довідник типів обладнання ---
  const typeNames: Array<[string, string]> = [
    ["Лазерний верстат", "Лазерный станок"],
    ["Токарний верстат з ЧПК", "Токарный станок с ЧПУ"],
    ["Фрезерний верстат з ЧПК", "Фрезерный станок с ЧПУ"],
    ["Листозгинальний прес", "Листогибочный пресс"],
    ["Універсальний токарний верстат", "Универсальный токарный станок"],
    ["Електроерозійний верстат", "Электроэрозионный станок"],
    ["Інше", "Другое"],
  ];
  const types: Record<string, string> = {};
  for (const [nameUk, nameRu] of typeNames) {
    const t = await prisma.machineType.upsert({
      where: { nameUk },
      update: { nameRu },
      create: { nameUk, nameRu },
    });
    types[nameUk] = t.id;
  }

  // --- Менеджери ---
  for (const name of [
    "Тимченко",
    "Беспалих",
    "Таймер",
    "Левін",
    "Коваленко",
    "Гринь",
    "Семенчак",
    "Комаров",
  ]) {
    await prisma.manager.upsert({ where: { name }, update: {}, create: { name } });
  }

  // --- Бригади ---
  const brigadeFliaga = await prisma.brigade.upsert({
    where: { name: "Бригада Фляги" },
    update: {},
    create: { name: "Бригада Фляги" },
  });
  const brigadeKyrylko = await prisma.brigade.upsert({
    where: { name: "Бригада Кирилка" },
    update: {},
    create: { name: "Бригада Кирилка" },
  });

  // --- Користувачі ---
  const admin = await prisma.user.upsert({
    where: { login: "admin" },
    update: {},
    create: {
      name: "Керівник відділу",
      login: "admin",
      passwordHash: hash(ADMIN_PASSWORD),
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { login: "director" },
    update: {},
    create: {
      name: "Директор",
      login: "director",
      passwordHash: hash(VIEWER_PASSWORD),
      role: Role.VIEWER,
    },
  });

  await prisma.user.upsert({
    where: { login: "accountant" },
    update: {},
    create: {
      name: "Бухгалтер",
      login: "accountant",
      passwordHash: hash(ACCOUNTANT_PASSWORD),
      role: Role.ACCOUNTANT,
    },
  });

  await prisma.user.upsert({
    where: { login: "flyaga" },
    update: {},
    create: {
      name: "Фляга",
      login: "flyaga",
      passwordHash: hash(BRIGADIER_PASSWORD),
      role: Role.BRIGADE_LEADER,
      brigadeId: brigadeFliaga.id,
    },
  });

  await prisma.user.upsert({
    where: { login: "kyrylko" },
    update: {},
    create: {
      name: "Кирилко",
      login: "kyrylko",
      passwordHash: hash(BRIGADIER_PASSWORD),
      role: Role.BRIGADE_LEADER,
      brigadeId: brigadeKyrylko.id,
    },
  });

  // --- Демо-клієнти та обладнання ---
  const existingClients = await prisma.client.count();
  if (existingClients === 0) {
    const clientDnipro = await prisma.client.create({
      data: {
        name: "ТОВ «Дніпро Метал Профіль»",
        city: "Дніпро",
        oblast: "Дніпропетровська",
        contacts: {
          create: [{ position: "Головний механік", fullName: "Петренко І.В.", phone: "+380 67 000 00 01" }],
        },
        machines: {
          create: [
            {
              typeId: types["Лазерний верстат"],
              model: "MAGICK ML-3015 3kW",
              serialNumber: "ML3015-2309-114",
            },
            {
              typeId: types["Листозгинальний прес"],
              model: "ADH SYNCRO 110/3200",
              serialNumber: "SB110-2211-072",
            },
          ],
        },
      },
      include: { machines: true },
    });

    const clientLviv = await prisma.client.create({
      data: {
        name: "ПрАТ «Львівагромаш»",
        city: "Львів",
        oblast: "Львівська",
        contacts: {
          create: [{ position: "Нач. виробництва", fullName: "Коваль О.М.", phone: "+380 67 000 00 02" }],
        },
        machines: {
          create: [
            {
              typeId: types["Токарний верстат з ЧПК"],
              model: "EUROMET VD510 (SDS200L)",
              serialNumber: "VD510-2107-031",
              note: "Історія: проблема з частотником, ремонт 2026",
            },
          ],
        },
      },
      include: { machines: true },
    });

    const clientKharkiv = await prisma.client.create({
      data: {
        name: "ТОВ «Бурова компанія Горизонти»",
        city: "Харків",
        oblast: "Харківська",
        contacts: {
          create: [{ position: "Гол. інженер", fullName: "Сидоренко В.П.", phone: "+380 67 000 00 03" }],
        },
        machines: {
          create: [
            {
              typeId: types["Токарний верстат з ЧПК"],
              model: "SZGH CK6150 (Fanuc 0i-TF Plus)",
              serialNumber: "CK6150-2402-008",
            },
          ],
        },
      },
      include: { machines: true },
    });

    // --- Демо-рахунки ---
    const inv = async (clientId: string, number: string) =>
      (
        await prisma.invoice.upsert({
          where: { clientId_number: { clientId, number } },
          update: {},
          create: { clientId, number },
        })
      ).id;

    // --- Демо-задачі ---
    const mkTask = (data: {
      brigadeId: string;
      clientId: string;
      machineIds?: string[];
      city: string;
      oblast: string;
      invoiceId?: string;
      note?: string;
      dateFrom: Date;
      dateTo: Date;
      status: TaskStatus;
      failureReason?: string;
      createdById: string;
    }) =>
      prisma.task.create({
        data: {
          ...data,
          machineIds: undefined,
          machines: data.machineIds?.length
            ? { connect: data.machineIds.map((id) => ({ id })) }
            : undefined,
        } as any,
      });

    const t1 = await mkTask({
      brigadeId: brigadeFliaga.id,
      clientId: clientDnipro.id,
      machineIds: [clientDnipro.machines[0].id],
      city: "Дніпро",
      oblast: "Дніпропетровська",
      invoiceId: await inv(clientDnipro.id, "СФ-2026-0712"),
      note: "Заміна захисного скла, юстування оптики",
      dateFrom: day(0),
      dateTo: day(1),
      status: TaskStatus.ON_SITE,
      createdById: admin.id,
    });

    const t2 = await mkTask({
      brigadeId: brigadeKyrylko.id,
      clientId: clientLviv.id,
      machineIds: [clientLviv.machines[0].id],
      city: "Львів",
      oblast: "Львівська",
      invoiceId: await inv(clientLviv.id, "СФ-2026-0715"),
      note: "Діагностика частотного перетворювача SDS200L",
      dateFrom: day(1),
      dateTo: day(2),
      status: TaskStatus.CONFIRMED,
      createdById: admin.id,
    });

    const t3 = await mkTask({
      brigadeId: brigadeFliaga.id,
      clientId: clientKharkiv.id,
      machineIds: [clientKharkiv.machines[0].id],
      city: "Харків",
      oblast: "Харківська",
      invoiceId: await inv(clientKharkiv.id, "СФ-2026-0698"),
      note: "ПНР після встановлення, навчання операторів",
      dateFrom: day(-7),
      dateTo: day(-5),
      status: TaskStatus.DONE,
      createdById: admin.id,
    });

    const t4 = await mkTask({
      brigadeId: brigadeKyrylko.id,
      clientId: clientDnipro.id,
      machineIds: [clientDnipro.machines[1].id],
      city: "Дніпро",
      oblast: "Дніпропетровська",
      invoiceId: await inv(clientDnipro.id, "СФ-2026-0701"),
      note: "Калібрування осі Y",
      dateFrom: day(-3),
      dateTo: day(-2),
      status: TaskStatus.NOT_DONE,
      failureReason: "Клієнт не підготував верстат до робіт, виїзд перенесено",
      createdById: admin.id,
    });

    for (const t of [t1, t2, t3, t4]) {
      await prisma.taskStatusLog.create({
        data: {
          taskId: t.id,
          userId: admin.id,
          toStatus: t.status,
          source: LogSource.SYSTEM,
          comment: "Створено seed-скриптом",
        },
      });
    }
  }

  // --- Геокеш демо-міст (щоб карта працювала одразу, без Nominatim) ---
  const geo: Array<[string, string, number, number]> = [
    ["Київ", "Київська", 50.4501, 30.5234],
    ["Дніпро", "Дніпропетровська", 48.4647, 35.0462],
    ["Львів", "Львівська", 49.8397, 24.0297],
    ["Харків", "Харківська", 49.9935, 36.2304],
    ["Одеса", "Одеська", 46.4825, 30.7233],
  ];
  for (const [city, oblast, lat, lng] of geo) {
    await prisma.geoCache.upsert({
      where: { city_oblast: { city, oblast } },
      update: {},
      create: { city, oblast, lat, lng },
    });
  }

  console.log("Seed завершено.");
  console.log("Логіни: admin / director / accountant / flyaga / kyrylko");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
