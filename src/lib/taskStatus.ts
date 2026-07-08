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

/** Дозволені переходи для бригадира (ланцюжок уперед + відмова з причиною) */
const BRIGADIER_CHAIN: Record<TaskStatusValue, TaskStatusValue[]> = {
  ASSIGNED: ["CONFIRMED"],
  CONFIRMED: ["EN_ROUTE", "NOT_DONE"],
  EN_ROUTE: ["ON_SITE", "NOT_DONE"],
  ON_SITE: ["DONE", "PARTIALLY_DONE", "NOT_DONE"],
  DONE: [],
  PARTIALLY_DONE: [],
  NOT_DONE: [],
};

export function nextStatusesFor(role: string, current: TaskStatusValue): TaskStatusValue[] {
  if (role === "ADMIN") return ALL_STATUSES.filter((s) => s !== current);
  if (role === "BRIGADE_LEADER") return BRIGADIER_CHAIN[current] ?? [];
  return [];
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
