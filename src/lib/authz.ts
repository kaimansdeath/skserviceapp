import { auth } from "@/auth";

export class AuthzError extends Error {}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new AuthzError("UNAUTHORIZED");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new AuthzError("FORBIDDEN");
  return session;
}

/** Бригадир може працювати лише зі своєю бригадою */
export function canTouchBrigade(session: { user: { role: string; brigadeId: string | null } }, brigadeId: string) {
  if (session.user.role === "ADMIN") return true;
  if (session.user.role === "BRIGADE_LEADER") return session.user.brigadeId === brigadeId;
  return false;
}

/**
 * Чи може користувач ЗМІНЮВАТИ задачу (статуси).
 * Адмін — так; бригадир — якщо призначений на задачу (або legacy-збіг бригади);
 * працівник бригади — ні (лише перегляд).
 */
export function canTouchTask(
  session: { user: { id?: string; role: string; brigadeId: string | null } },
  task: {
    brigadeId: string | null;
    secondBrigadeId?: string | null;
    assigneeIds?: string[];
  }
) {
  if (session.user.role === "ADMIN") return true;
  if (session.user.role !== "BRIGADE_LEADER") return false;
  if (session.user.id && task.assigneeIds?.includes(session.user.id)) return true;
  if (!session.user.brigadeId) return false;
  return (
    session.user.brigadeId === task.brigadeId ||
    session.user.brigadeId === (task.secondBrigadeId ?? null)
  );
}

/** Чи бачить користувач задачу */
export function canSeeTask(
  session: { user: { id: string; role: string; brigadeId: string | null } },
  task: { brigadeId: string | null; secondBrigadeId?: string | null; assigneeIds?: string[] }
) {
  if (["ADMIN", "VIEWER", "ACCOUNTANT"].includes(session.user.role)) return true;
  if (task.assigneeIds?.includes(session.user.id)) return true;
  return (
    !!session.user.brigadeId &&
    (session.user.brigadeId === task.brigadeId ||
      session.user.brigadeId === (task.secondBrigadeId ?? null))
  );
}
