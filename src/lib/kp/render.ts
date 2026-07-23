import { promises as fs } from "fs";
import path from "path";
import {
  AlignmentType,
  Document,
  Footer,
  FrameAnchorType,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  VerticalPositionRelativeFrom,
  WidthType,
  BorderStyle,
} from "docx";
import { imageSize } from "image-size";
import { KP, KP_ABOUT_COMPANY, KP_ASSETS_DIR, KP_ASSET_FILES, KP_CONTACTS, KP_PAYMENT_SCHEDULE } from "./constants";
import type { KpAiResult } from "./ai";

const DXA_TO_EMU = 635;
const PX_TO_EMU = 9525;

type ImgType = "png" | "jpg" | "gif";

type Asset = { data: Buffer; type: ImgType; w: number; h: number };

export type KpRenderInput = {
  ai: KpAiResult;
  machineName: string;
  price?: string; // число як текст, напр. "714363.30" або "714 363"
  currency?: string; // "грн" | "USD" | ...
  deliveryTerm?: string;
  photos: Array<{ buffer: Buffer; mime: string }>;
};

export type KpRenderResult = { buffer: Buffer; warnings: string[] };

/** Побудова фірмового DOCX КП */
export async function renderKpDocx(input: KpRenderInput): Promise<KpRenderResult> {
  const warnings: string[] = [];

  const cover = await loadAsset(KP_ASSET_FILES.cover);
  const footerImg = await loadAsset(KP_ASSET_FILES.footer);
  const companyTop = await loadAsset(KP_ASSET_FILES.companyTop);
  const companyBottom = await loadAsset(KP_ASSET_FILES.companyBottom);
  if (!cover) warnings.push("Ассет обкладинки SK_cover_base.png не знайдено — обкладинку зібрано у текстовому вигляді.");
  if (!footerImg) warnings.push("Ассет колонтитула SK_footer.png не знайдено — колонтитул пропущено.");
  if (!companyTop || !companyBottom) warnings.push("Фотоколажі «Про компанію» не знайдено — блок зібрано без колажів.");

  const photos = input.photos
    .map((p) => toEmbeddable(p.buffer, p.mime))
    .filter((p): p is Asset => !!p);
  if (input.photos.length > 0 && photos.length === 0) {
    warnings.push("Завантажені фото у форматі, який не вставляється у DOCX (webp/heic) — зони фото залишено порожніми.");
  }
  if (photos.length === 0) warnings.push("Фото верстата не додано — обкладинка та розділ «Про верстат» без фото.");

  const title = (input.ai.fullName || input.machineName).toUpperCase();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: KP.FONT, size: 22, color: KP.TEXT }, // 11 пт
          paragraph: { spacing: { after: 120, line: 276 } },
        },
      },
    },
    sections: [
      buildCoverSection(title, cover, photos[0]),
      buildBodySection(input, title, footerImg, companyTop, companyBottom, photos, warnings),
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return { buffer: Buffer.from(buffer), warnings };
}

/* ============================== Обкладинка ============================== */

function buildCoverSection(title: string, cover: Asset | null, photo?: Asset) {
  const children: Paragraph[] = [];

  if (cover) {
    // Обкладинка на всю сторінку позаду тексту
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: cover.type,
            data: cover.data,
            transformation: { width: 794, height: 1123 },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
              behindDocument: true,
            },
          }),
        ],
      })
    );

    // Назва верстата — окремим редагованим шаром у сірій смузі
    children.push(
      new Paragraph({
        frame: {
          type: "absolute",
          position: { x: KP.COVER_TITLE.x, y: KP.COVER_TITLE.y },
          width: KP.COVER_TITLE.w,
          height: KP.COVER_TITLE.h,
          anchor: { horizontal: FrameAnchorType.PAGE, vertical: FrameAnchorType.PAGE },
        },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title,
            bold: true,
            color: KP.WHITE,
            font: KP.FONT,
            size: titleSizeHalfPt(title),
          }),
        ],
      })
    );

    // Фото верстата в центральній білій зоні
    if (photo) {
      const { w, h } = fit(photo, KP.COVER_PHOTO_MAX_W_PX, KP.COVER_PHOTO_MAX_H_PX);
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: photo.type,
              data: photo.data,
              transformation: { width: w, height: h },
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  align: HorizontalPositionAlign.CENTER,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  offset: KP.COVER_PHOTO_Y * DXA_TO_EMU,
                },
              },
            }),
          ],
        })
      );
    }
  } else {
    // Резервна текстова обкладинка у фірмових кольорах
    children.push(
      new Paragraph({ spacing: { before: 2400 }, children: [] }),
      barParagraph("КОМЕРЦІЙНА ПРОПОЗИЦІЯ", KP.GREEN, 36),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000, after: 400 },
        shading: { type: ShadingType.CLEAR, fill: KP.HEAD_GRAY },
        children: [new TextRun({ text: title, bold: true, color: KP.WHITE, size: titleSizeHalfPt(title) })],
      })
    );
    if (photo) {
      const { w, h } = fit(photo, KP.COVER_PHOTO_MAX_W_PX, KP.COVER_PHOTO_MAX_H_PX);
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          children: [new ImageRun({ type: photo.type, data: photo.data, transformation: { width: w, height: h } })],
        })
      );
    }
    children.push(
      new Paragraph({ spacing: { before: 3000 }, children: [] }),
      ...KP_CONTACTS.map(
        (line) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: line, bold: true, color: KP.GREEN_DARK, size: 24 })],
          })
      )
    );
  }

  return {
    properties: {
      page: {
        size: { width: KP.PAGE_W, height: KP.PAGE_H },
        margin: cover
          ? { top: 0, right: 0, bottom: 0, left: 0 }
          : { top: KP.MARGIN, right: KP.MARGIN, bottom: KP.MARGIN, left: KP.MARGIN },
      },
    },
    children,
  };
}

function titleSizeHalfPt(title: string): number {
  // Автопідбір: коротка назва — більший кегль
  if (title.length <= 28) return 72; // 36 пт
  if (title.length <= 44) return 60; // 30 пт
  if (title.length <= 64) return 48; // 24 пт
  return 40; // 20 пт
}

/* ============================== Тіло КП ============================== */

function buildBodySection(
  input: KpRenderInput,
  title: string,
  footerImg: Asset | null,
  companyTop: Asset | null,
  companyBottom: Asset | null,
  photos: Asset[],
  warnings: string[]
) {
  const children: (Paragraph | Table)[] = [];

  /* --- ПРО КОМПАНІЮ --- */
  children.push(barParagraph("ПРО КОМПАНІЮ", KP.GREEN));
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 160 },
      children: [new TextRun({ text: "ТОВАРИСТВО «СТАН КОМПЛЕКТ»", bold: true, color: KP.GREEN_DARK, size: 26 })],
    })
  );
  if (companyTop) children.push(fullWidthImage(companyTop));
  for (const p of KP_ABOUT_COMPANY) {
    children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: p })] }));
  }
  if (companyBottom) children.push(fullWidthImage(companyBottom));

  /* --- ПРО ВЕРСТАТ --- */
  children.push(barParagraph("ПРО ВЕРСТАТ", KP.GREEN, undefined, true));
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 160 },
      children: [new TextRun({ text: title, bold: true, color: KP.GREEN_DARK, size: 26 })],
    })
  );
  if (photos[0]) {
    const { w, h } = fit(photos[0], 560, 380);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new ImageRun({ type: photos[0].type, data: photos[0].data, transformation: { width: w, height: h } })],
      })
    );
  }
  const about = input.ai.about.length
    ? input.ai.about
    : ["Опис конструкції верстата буде додано після уточнення технічних даних."];
  for (const p of about) {
    children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: p })] }));
  }
  const details = photos.slice(1, 4);
  if (details.length > 0) {
    children.push(detailPhotosRow(details));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 160 },
        children: [new TextRun({ text: `Вузли та оснащення верстата ${shortModel(title)}`, italics: true, size: 20, color: KP.VALUE_GRAY })],
      })
    );
  }

  /* --- ХАРАКТЕРИСТИКИ --- */
  children.push(barParagraph("ХАРАКТЕРИСТИКИ ВЕРСТАТА", KP.GREEN, undefined, true));
  if (input.ai.specs.length > 0) {
    children.push(specTable(input.ai.specs));
  } else {
    warnings.push("ШІ не витяг таблицю характеристик — перевірте вхідний файл ТХ.");
    children.push(new Paragraph({ children: [new TextRun({ text: "Таблиця характеристик потребує заповнення.", italics: true })] }));
  }

  /* --- КОМПЛЕКТАЦІЯ + ОПЦІЇ --- */
  children.push(barParagraph("КОМПЛЕКТАЦІЯ", KP.GREEN, undefined, true));
  pushBullets(children, input.ai.equipment.length ? input.ai.equipment : ["Стандартна комплектація уточнюється у виробника."]);
  children.push(barParagraph("ДОДАТКОВІ ОПЦІЇ", KP.ORANGE));
  pushBullets(children, input.ai.options.length ? input.ai.options : ["Додаткові опції — за запитом."]);

  /* --- КОМЕРЦІЙНА ЧАСТИНА --- */
  children.push(barParagraph("КОМЕРЦІЙНА ЧАСТИНА", KP.GREEN));
  children.push(labelParagraph("Вартість з врахуванням ПДВ:"));

  const priceText = formatPrice(input.price, input.currency);
  if (!input.price?.trim()) warnings.push("Ціну не вказано — у КП підставлено «за домовленістю». Заповніть перед відправкою клієнту.");
  children.push(
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: KP.CONTENT_W }],
      spacing: { after: 160 },
      children: [
        new TextRun({ text: title }),
        new TextRun({ text: `\t${priceText}`, bold: true }),
      ],
    })
  );

  if (input.ai.extraModels.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Додаткові опції:", italics: true, color: KP.GREEN_DARK })],
      })
    );
    for (const m of input.ai.extraModels) {
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: KP.CONTENT_W }],
          spacing: { after: 40 },
          children: [new TextRun({ text: m.name }), new TextRun({ text: `\t${m.priceNote || "за запитом"}`, bold: true })],
        })
      );
    }
  }

  const terms: Array<[string, string]> = [
    ["Гарантія: ", "12 місяців з дати підписання акту ПНР."],
    ["Монтаж: ", "Пуско-налагоджувальні роботи та інструктаж персоналу проводяться спеціалістами ТОВ «Стан Комплект»."],
    ["Сервіс: ", "ТОВ «Стан Комплект» забезпечує сервісну підтримку в гарантійний та післягарантійний період."],
    ["Термін постачання: ", input.deliveryTerm?.trim() || "уточнюється (поле потребує заповнення)."],
    ["Умови постачання: ", "DDP (склад Покупця)."],
  ];
  if (!input.deliveryTerm?.trim()) warnings.push("Термін постачання не вказано — у КП стоїть плейсхолдер.");
  for (const [label, text] of terms) {
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text: label, bold: true, color: KP.GREEN_DARK }), new TextRun({ text })],
      })
    );
  }
  children.push(labelParagraph("Графік платежів:"));
  pushBullets(children, KP_PAYMENT_SCHEDULE);

  const footers = footerImg
    ? {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type: footerImg.type,
                  data: footerImg.data,
                  transformation: fitWidth(footerImg, 698),
                }),
              ],
            }),
          ],
        }),
      }
    : undefined;

  return {
    properties: {
      page: {
        size: { width: KP.PAGE_W, height: KP.PAGE_H },
        margin: { top: KP.MARGIN, right: KP.MARGIN, bottom: footerImg ? 1100 : KP.MARGIN, left: KP.MARGIN },
      },
    },
    footers,
    children,
  };
}

/* ============================== Хелпери ============================== */

function barParagraph(text: string, fill: string, sizeHalfPt = 30, pageBreak = false): Paragraph {
  return new Paragraph({
    pageBreakBefore: pageBreak,
    shading: { type: ShadingType.CLEAR, fill },
    indent: { left: 120 },
    spacing: { before: 260, after: 160 },
    children: [new TextRun({ text, bold: true, color: KP.WHITE, size: sizeHalfPt })],
  });
}

function labelParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text, bold: true, color: KP.GREEN_DARK })],
  });
}

function pushBullets(children: (Paragraph | Table)[], items: string[]) {
  for (const item of items) {
    children.push(
      new Paragraph({
        indent: { left: 460, hanging: 240 },
        spacing: { after: 60 },
        children: [new TextRun({ text: "•  ", bold: true, color: KP.GREEN }), new TextRun({ text: item })],
      })
    );
  }
}

function specTable(specs: Array<{ param: string; unit: string; value: string }>): Table {
  const headerCells = ["ПАРАМЕТР", "ОД. ВИМ.", "ЗНАЧЕННЯ"].map(
    (t, i) =>
      new TableCell({
        width: { size: KP.SPEC_COLS[i], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: KP.HEAD_GRAY },
        margins: { top: 38, bottom: 38, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240 },
            children: [new TextRun({ text: t, bold: true, color: KP.WHITE, size: 20 })],
          }),
        ],
      })
  );

  const rows = [
    new TableRow({ cantSplit: true, tableHeader: true, children: headerCells }),
    ...specs.map(
      (s, idx) =>
        new TableRow({
          cantSplit: true,
          children: [s.param, s.unit || "—", s.value || "—"].map(
            (text, i) =>
              new TableCell({
                width: { size: KP.SPEC_COLS[i], type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? KP.ROW_GRAY : KP.WHITE },
                margins: { top: 24, bottom: 24, left: 100, right: 100 },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 240 },
                    children: [new TextRun({ text, size: 20, color: i === 0 ? KP.TEXT : KP.VALUE_GRAY })],
                  }),
                ],
              })
          ),
        })
    ),
  ];

  return new Table({
    width: { size: KP.CONTENT_W, type: WidthType.DXA },
    borders: whiteBorders(),
    rows,
  });
}

function whiteBorders() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: KP.WHITE };
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}

function detailPhotosRow(details: Asset[]): Table {
  const colW = Math.floor(KP.CONTENT_W / details.length);
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return new Table({
    width: { size: KP.CONTENT_W, type: WidthType.DXA },
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: details.map((img) => {
          const { w, h } = fitHeight(img, 155, Math.floor(colW / 6.5));
          return new TableCell({
            width: { size: colW, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: w, height: h } })],
              }),
            ],
          });
        }),
      }),
    ],
  });
}

function fullWidthImage(img: Asset): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new ImageRun({ type: img.type, data: img.data, transformation: fitWidth(img, 698) })],
  });
}

function shortModel(title: string): string {
  const words = title.split(/\s+/);
  return words[words.length - 1] || title;
}

function fit(img: Asset, maxW: number, maxH: number): { w: number; h: number } {
  const k = Math.min(maxW / img.w, maxH / img.h, 1);
  return { w: Math.round(img.w * k), h: Math.round(img.h * k) };
}

function fitWidth(img: Asset, width: number): { width: number; height: number } {
  return { width, height: Math.round((img.h / img.w) * width) };
}

function fitHeight(img: Asset, height: number, maxW: number): { w: number; h: number } {
  let w = Math.round((img.w / img.h) * height);
  let h = height;
  if (w > maxW) {
    h = Math.round((img.h / img.w) * maxW);
    w = maxW;
  }
  return { w, h };
}

function toEmbeddable(buffer: Buffer, mime: string): Asset | null {
  let type: ImgType | null = null;
  if (mime === "image/png") type = "png";
  else if (mime === "image/jpeg") type = "jpg";
  else if (mime === "image/gif") type = "gif";
  if (!type) return null;
  try {
    const dim = imageSize(buffer);
    if (!dim.width || !dim.height) return null;
    return { data: buffer, type, w: dim.width, h: dim.height };
  } catch {
    return null;
  }
}

async function loadAsset(name: string): Promise<Asset | null> {
  try {
    const p = path.join(KP_ASSETS_DIR, name);
    const data = await fs.readFile(p);
    const dim = imageSize(data);
    if (!dim.width || !dim.height) return null;
    const type: ImgType = dim.type === "jpg" || dim.type === "jpeg" ? "jpg" : dim.type === "gif" ? "gif" : "png";
    return { data, type, w: dim.width, h: dim.height };
  } catch {
    return null;
  }
}

/** «714363.3» + «грн» → «714 363.00 грн з ПДВ» */
export function formatPrice(price?: string, currency?: string): string {
  const raw = (price ?? "").replace(/\s/g, "").replace(",", ".").trim();
  if (!raw) return "за домовленістю";
  const num = Number(raw);
  if (!Number.isFinite(num)) return `${price} ${currency ?? ""} з ПДВ`.trim();
  const [intPart, frac] = num.toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped}.${frac} ${currency?.trim() || "грн"} з ПДВ`;
}
