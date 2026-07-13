/** Гарантія: введення в експлуатацію = останній день задачі ПНР (Виконано) */

export const WARRANTY_OPTIONS = [0, 6, 12, 18, 24, 36] as const;

/** Дата запуску за замовчуванням, коли ПНР невідомий */
export const DEFAULT_COMMISSIONING = new Date("2024-01-01T00:00:00.000Z");

export function warrantyEnd(commissioning: Date, months: number): Date {
  const d = new Date(commissioning);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
