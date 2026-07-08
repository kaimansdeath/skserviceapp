import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const KYIV_TZ = "Europe/Kyiv";

/** Сьогоднішня дата в Києві як Date 00:00 UTC (для порівняння з @db.Date) */
export function kyivToday(): Date {
  const ymd = formatInTimeZone(new Date(), KYIV_TZ, "yyyy-MM-dd");
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** yyyy-MM-dd → Date 00:00 UTC (для запису в @db.Date) */
export function dateFieldFromYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDateUa(d: Date): string {
  const [y, m, dd] = toYmd(d).split("-");
  return `${dd}.${m}.${y}`;
}

export function isOverdue(dateTo: Date, status: string): boolean {
  return !["DONE", "PARTIALLY_DONE", "NOT_DONE"].includes(status) && dateTo < kyivToday();
}

/** Межа архіву: завершені задачі старші за 14 днів */
export function archiveCutoff(): Date {
  const d = kyivToday();
  d.setUTCDate(d.getUTCDate() - 14);
  return d;
}

export function isToday(dateFrom: Date, dateTo: Date): boolean {
  const t = kyivToday().getTime();
  return dateFrom.getTime() <= t && t <= dateTo.getTime();
}

/** Поточний час у Києві для відображення */
export function nowKyivString(): string {
  return formatInTimeZone(new Date(), KYIV_TZ, "dd.MM.yyyy HH:mm");
}

export { fromZonedTime };
