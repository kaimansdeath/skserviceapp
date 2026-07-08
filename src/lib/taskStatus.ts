export const ALL_STATUSES = [
  "ASSIGNED",
  "CONFIRMED",
  "EN_ROUTE",
  "ON_SITE",
  "DONE",
  "PARTIALLY_DONE",
  "NOT_DONE",
] as const;

export type TaskStatusValue = (typeof ALL_STATUSES)[number];

export const FINAL_STATUSES: TaskStatusValue[] = ["DONE", "PARTIALLY_DONE", "NOT_DONE"];

/** Статуси, для яких обов'язковий коментар/причина */
export const REASON_STATUSES: TaskStatusValue[] = ["PARTIALLY_DONE", "NOT_DONE"];

/** Порядок робочого ланцюжка (без фінальних) */
const CHAIN_ORDER: TaskStatusValue[] = ["ASSIGNED", "CONFIRMED", "EN_ROUTE", "ON_SITE"];

/**
 * Бригадир може рухати статус лише вперед по ланцюжку,
 * але доступні одразу ВСІ подальші варіанти (включно з фінальними).
 */
export function nextStatusesFor(role: string, current: TaskStatusValue): TaskStatusValue[] {
  if (role === "ADMIN") return ALL_STATUSES.filter((s) => s !== current);
  if (role !== "BRIGADE_LEADER") return [];
  if (FINAL_STATUSES.includes(current)) return [];
  const idx = CHAIN_ORDER.indexOf(current);
  const forward = idx >= 0 ? CHAIN_ORDER.slice(idx + 1) : [];
  return [...forward, "DONE", "PARTIALLY_DONE", "NOT_DONE"];
}

/** Tailwind-класи бейджа статусу */
export const STATUS_BADGE: Record<TaskStatusValue, string> = {
  ASSIGNED: "bg-neutral-200 text-neutral-700",
  CONFIRMED: "bg-sky-100 text-sky-800",
  EN_ROUTE: "bg-orange-100 text-orange-700",
  ON_SITE: "bg-emerald-100 text-emerald-800",
  DONE: "bg-brand text-white",
  PARTIALLY_DONE: "bg-amber-100 text-amber-800",
  NOT_DONE: "bg-red-100 text-red-700",
};

export const TASK_TYPES = [
  "ENGINEERING",
  "PNR",
  "REPAIR",
  "DEFECTATION",
  "VISIT",
  "OTHER",
] as const;

/** HEX-кольори статусів (карта, календар-діаграма) */
export const STATUS_HEX: Record<TaskStatusValue, string> = {
  ASSIGNED: "#9CA3AF",
  CONFIRMED: "#0EA5E9",
  EN_ROUTE: "#F36E33",
  ON_SITE: "#10B981",
  DONE: "#009C4B",
  PARTIALLY_DONE: "#F59E0B",
  NOT_DONE: "#DC2626",
};
