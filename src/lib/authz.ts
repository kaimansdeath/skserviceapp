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

/** Чи може користувач працювати із задачею (враховує другу бригаду) */
export function canTouchTask(
  session: { user: { role: string; brigadeId: string | null } },
  task: { brigadeId: string | null; secondBrigadeId?: string | null }
) {
  if (session.user.role === "ADMIN") return true;
  if (session.user.role !== "BRIGADE_LEADER" || !session.user.brigadeId) return false;
  return (
    session.user.brigadeId === task.brigadeId ||
    session.user.brigadeId === (task.secondBrigadeId ?? null)
  );
}
