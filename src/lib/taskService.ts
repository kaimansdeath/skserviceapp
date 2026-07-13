import { prisma } from "@/lib/prisma";
import { canTouchTask } from "@/lib/authz";
import { nextStatusesFor, REASON_STATUSES, type TaskStatusValue } from "@/lib/taskStatus";

export type StatusActor = { id: string; role: string; brigadeId: string | null };

/**
 * Спільне ядро зміни статусу задачі — використовується
 * і веб-інтерфейсом (server action), і Telegram-ботом.
 */
export async function applyStatusChange(params: {
  taskId: string;
  to: TaskStatusValue;
  reason?: string;
  actor: StatusActor;
  source: "WEB" | "TELEGRAM";
}) {
  const task = await prisma.task.findUnique({
    where: { id: params.taskId },
    include: { assignees: { select: { id: true } } },
  });
  if (!task) return { error: "NOT_FOUND" as const };

  const assigneeIds = (task as any).assignees.map((a: any) => a.id);
  if (!canTouchTask({ user: params.actor } as any, { ...task, assigneeIds })) {
    return { error: "FORBIDDEN" as const };
  }

  const allowed = nextStatusesFor(params.actor.role, task.status as TaskStatusValue);
  if (!allowed.includes(params.to)) return { error: "TRANSITION" as const };

  const needsReason = REASON_STATUSES.includes(params.to);
  if (needsReason && !params.reason?.trim()) return { error: "REASON_REQUIRED" as const };

  const comment = params.reason?.trim() || null; // для DONE — необов'язковий підсумок робіт
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: params.to,
      failureReason: needsReason ? comment : null,
    },
  });
  await prisma.taskStatusLog.create({
    data: {
      taskId: task.id,
      userId: params.actor.id,
      fromStatus: task.status,
      toStatus: params.to,
      comment,
      source: params.source,
    },
  });
  return { ok: true as const, task: updated };
}
