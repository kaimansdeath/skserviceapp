"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin, canTouchBrigade } from "@/lib/authz";
import { findOverlaps } from "@/lib/overlap";
import { nextStatusesFor, type TaskStatusValue } from "@/lib/taskStatus";
import { dateFieldFromYmd, toYmd } from "@/lib/dates";
import { notifyTaskAssigned } from "@/lib/telegram";

const taskInput = z.object({
  brigadeId: z.string().min(1),
  clientId: z.string().min(1),
  machineId: z.string().optional().nullable(),
  city: z.string().min(1),
  oblast: z.string().min(1),
  invoiceNumber: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TaskInput = z.infer<typeof taskInput>;

export async function createTask(input: TaskInput) {
  const session = await requireAdmin();
  const data = taskInput.parse(input);
  if (data.dateTo < data.dateFrom) return { error: "DATE_RANGE" as const };

  const task = await prisma.task.create({
    data: {
      brigadeId: data.brigadeId,
      clientId: data.clientId,
      machineId: data.machineId || null,
      city: data.city.trim(),
      oblast: data.oblast.trim(),
      invoiceNumber: data.invoiceNumber?.trim() || null,
      note: data.note?.trim() || null,
      dateFrom: dateFieldFromYmd(data.dateFrom),
      dateTo: dateFieldFromYmd(data.dateTo),
      createdById: session.user.id,
    },
  });
  await prisma.taskStatusLog.create({
    data: {
      taskId: task.id,
      userId: session.user.id,
      toStatus: "ASSIGNED",
      source: "WEB",
    },
  });
  // Telegram-сповіщення бригадиру (не валить операцію при збої)
  notifyTaskAssigned(task.id).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true as const, id: task.id };
}

export async function updateTask(taskId: string, input: TaskInput & { status?: TaskStatusValue; failureReason?: string | null }) {
  const session = await requireAdmin();
  const data = taskInput.parse(input);
  if (data.dateTo < data.dateFrom) return { error: "DATE_RANGE" as const };

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return { error: "NOT_FOUND" as const };

  const statusChanged = input.status && input.status !== existing.status;
  const brigadeChanged = data.brigadeId !== existing.brigadeId;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      brigadeId: data.brigadeId,
      clientId: data.clientId,
      machineId: data.machineId || null,
      city: data.city.trim(),
      oblast: data.oblast.trim(),
      invoiceNumber: data.invoiceNumber?.trim() || null,
      note: data.note?.trim() || null,
      dateFrom: dateFieldFromYmd(data.dateFrom),
      dateTo: dateFieldFromYmd(data.dateTo),
      ...(statusChanged
        ? {
            status: input.status,
            failureReason: input.status === "NOT_DONE" ? input.failureReason?.trim() || null : null,
          }
        : {}),
    },
  });

  if (statusChanged) {
    await prisma.taskStatusLog.create({
      data: {
        taskId,
        userId: session.user.id,
        fromStatus: existing.status,
        toStatus: input.status!,
        comment: input.status === "NOT_DONE" ? input.failureReason?.trim() || null : null,
        source: "WEB",
      },
    });
  }
  if (brigadeChanged) {
    notifyTaskAssigned(taskId).catch(() => {});
  }
  revalidatePath("/", "layout");
  return { ok: true as const, id: taskId };
}

export async function changeTaskStatus(params: {
  taskId: string;
  to: TaskStatusValue;
  reason?: string;
}) {
  const session = await requireSession();
  const task = await prisma.task.findUnique({ where: { id: params.taskId } });
  if (!task) return { error: "NOT_FOUND" as const };

  if (!canTouchBrigade(session as any, task.brigadeId)) return { error: "FORBIDDEN" as const };

  const allowed = nextStatusesFor(session.user.role, task.status as TaskStatusValue);
  if (!allowed.includes(params.to)) return { error: "TRANSITION" as const };

  if (params.to === "NOT_DONE" && !params.reason?.trim()) {
    return { error: "REASON_REQUIRED" as const };
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: params.to,
      failureReason: params.to === "NOT_DONE" ? params.reason!.trim() : null,
    },
  });
  await prisma.taskStatusLog.create({
    data: {
      taskId: task.id,
      userId: session.user.id,
      fromStatus: task.status,
      toStatus: params.to,
      comment: params.to === "NOT_DONE" ? params.reason!.trim() : null,
      source: "WEB",
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Перевірка перетину дат (для попередження у формі) */
export async function checkOverlap(params: {
  brigadeId: string;
  dateFrom: string;
  dateTo: string;
  excludeTaskId?: string;
}) {
  await requireSession();
  if (!params.brigadeId || !params.dateFrom || !params.dateTo) return [];
  if (params.dateTo < params.dateFrom) return [];
  const overlaps = await findOverlaps({
    brigadeId: params.brigadeId,
    dateFrom: dateFieldFromYmd(params.dateFrom),
    dateTo: dateFieldFromYmd(params.dateTo),
    excludeTaskId: params.excludeTaskId,
  });
  return overlaps.map((t: any) => ({
    id: t.id,
    client: t.client.name,
    city: t.city,
    dateFrom: toYmd(t.dateFrom),
    dateTo: toYmd(t.dateTo),
  }));
}
