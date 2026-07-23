import path from "path";

/** Фірмові константи КП (інструкція «Генерація КП Стан Комплект» v2) */
export const KP = {
  // Кольори
  GREEN: "009C4B",
  GREEN_DARK: "007435",
  ORANGE: "F36E33",
  ROW_GRAY: "D9D9D9",
  VALUE_GRAY: "414042",
  TEXT: "262626",
  HEAD_GRAY: "767171",
  WHITE: "FFFFFF",

  // Сторінка A4, поля 0,5″
  PAGE_W: 11906,
  PAGE_H: 16838,
  MARGIN: 720,
  CONTENT_W: 10466, // ширина контенту в DXA

  // Таблиця характеристик: ПАРАМЕТР / ОД. ВИМ. / ЗНАЧЕННЯ
  SPEC_COLS: [6266, 1800, 2400],

  FONT: "Montserrat",

  // Обкладинка: зона назви верстата (сіра смуга) та зона фото — DXA від краю сторінки.
  // За потреби підігнати під фактичну геометрію SK_cover_base.png.
  COVER_TITLE: { x: 950, y: 2350, w: 10000, h: 2000 },
  COVER_PHOTO_Y: 7300, // верх зони фото (біла зона по центру)
  COVER_PHOTO_MAX_W_PX: 470,
  COVER_PHOTO_MAX_H_PX: 330,
} as const;

/** Папка фірмових ассетів (обкладинка, колонтитул, колажі) */
export const KP_ASSETS_DIR = process.env.KP_ASSETS_DIR || path.join(process.cwd(), "assets", "kp");

export const KP_ASSET_FILES = {
  cover: "SK_cover_base.png",
  footer: "SK_footer.png",
  companyTop: "SK_company_top.png",
  companyBottom: "SK_company_bottom.png",
} as const;

/** Фіксований текст «Про компанію» */
export const KP_ABOUT_COMPANY = [
  "Ми — провідна українська компанія, що спеціалізується на розробці, виробництві та постачанні високотехнологічного обладнання для металообробки, автоматизації виробничих процесів та спеціалізованих рішень для промисловості.",
  "Ми пропонуємо комплексні рішення, які включають сучасне обладнання, впровадження інноваційних технологій та технічну підтримку на всіх етапах проекту — від ідеї до запуску в експлуатацію. Завдяки багаторічному досвіду, наша компанія забезпечує максимальну ефективність виробництва, скорочення витрат та підвищення якості продукції наших клієнтів.",
];

/** Контакти на резервній (текстовій) обкладинці, якщо ассет відсутній */
export const KP_CONTACTS = [
  "Україна, м. Київ, пр-т С. Бандери, 23",
  "+38 (073) 072-11-11",
  "sk@stankom.com",
  "www.stankom.com",
];

/** Графік платежів */
export const KP_PAYMENT_SCHEDULE = [
  "30% оплата після підписання Договору",
  "30% оплата перед відвантаженням від виробника",
  "30% оплата перед відвантаженням клієнту",
  "10% оплата після ПНР",
];

export type KpEquipmentTypeCode = "LASER" | "CNC" | "UNIVERSAL" | "OTHER";

export const KP_TYPE_ORDER: KpEquipmentTypeCode[] = ["LASER", "CNC", "UNIVERSAL", "OTHER"];
