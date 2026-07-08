"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/authz";
import { applyStatusChange } from "@/lib/taskService";
import { findOverlaps } from "@/lib/overlap";
import { REASON_STATUSES, type TaskStatusValue } from "@/lib/taskStatus";
import { dateFieldFromYmd, toYmd } from "@/lib/dates";
import { notifyTaskAssigned, notifyTaskComment } from "@/lib/telegram";
import { canTouchTask } from "@/lib/authz";

const taskInput = z
  .object({
    taskType: z
      .enum(["ENGINEERING", "PNR", "REPAIR", "DEFECTATION", "VISIT", "OTHER"])
      .default("OTHER"),
    executorType: z.enum(["BRIGADE", "OUTSOURCE"]).default("BRIGADE"),
    brigadeId: z.string().optional().nullable(),
    secondBrigadeId: z.string().optional().nullable(),
    outsourceName: z.string().optional().nullable(),
    clientId: z.string().min(1),
    machineIds: z.array(z.string()).default([]),
    city: z.string().min(1),
    oblast: z.string().min(1),
    invoiceId: z.string().optional().nullable(),
    orderNumber: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => (d.executorType === "BRIGADE" ? !!d.brigadeId : !!d.outsourceName?.trim()), {
    message: "EXECUTOR_REQUIRED",
  });

export type TaskInput = z.infer<typeof taskInput>;

export async function createTask(input: TaskInput) {
  const session = await requireAdmin();
  const data = taskInput.parse(input);
  if (data.dateTo < data.dateFrom) return { error: "DATE_RANGE" as const };

  const task = await prisma.task.create({
    data: {
      taskType: data.taskType,
      executorType: data.executorType,
      brigadeId: data.executorType === "BRIGADE" ? data.brigadeId! : null,
      secondBrigadeId:
        data.executorType === "BRIGADE" && data.secondBrigadeId && data.secondBrigadeId !== data.brigadeId
          ? data.secondBrigadeId
          : null,
      outsourceName: data.executorType === "OUTSOURCE" ? data.outsourceName!.trim() : null,
      clientId: data.clientId,
      machines: data.machineIds.length
        ? { connect: data.machineIds.map((id) => ({ id })) }
        : undefined,
      city: data.city.trim(),
      oblast: data.oblast.trim(),
      invoiceId: data.invoiceId || null,
      orderNumber: data.orderNumber?.trim() || null,
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
  const newBrigadeId = data.executorType === "BRIGADE" ? data.brigadeId! : null;
  const brigadeChanged = newBrigadeId !== existing.brigadeId && newBrigadeId !== null;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      taskType: data.taskType,
      executorType: data.executorType,
      brigadeId: newBrigadeId,
      secondBrigadeId:
        data.executorType === "BRIGADE" && data.secondBrigadeId && data.secondBrigadeId !== newBrigadeId
          ? data.secondBrigadeId
          : null,
      outsourceName: data.executorType === "OUTSOURCE" ? data.outsourceName!.trim() : null,
      clientId: data.clientId,
      machines: { set: data.machineIds.map((id) => ({ id })) },
      city: data.city.trim(),
      oblast: data.oblast.trim(),
      invoiceId: data.invoiceId || null,
      orderNumber: data.orderNumber?.trim() || null,
      note: data.note?.trim() || null,
      dateFrom: dateFieldFromYmd(data.dateFrom),
      dateTo: dateFieldFromYmd(data.dateTo),
      ...(statusChanged
        ? {
            status: input.status,
            failureReason: REASON_STATUSES.includes(input.status!)
              ? input.failureReason?.trim() || null
              : null,
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
        comment: REASON_STATUSES.includes(input.status!)
          ? input.failureReason?.trim() || null
          : null,
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
  const res = await applyStatusChange({
    taskId: params.taskId,
    to: params.to,
    reason: params.reason,
    actor: {
      id: session.user.id,
      role: session.user.role,
      brigadeId: session.user.brigadeId,
    },
    source: "WEB",
  });
  if ("error" in res) return res;
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

/** Видалення задачі — лише керівник відділу. Історія статусів видаляється каскадно. */
export async function deleteTask(taskId: string) {
  await requireAdmin();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "NOT_FOUND" as const };
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Коментар до задачі з веб-інтерфейсу (зберігається в обговоренні + сповіщення в TG) */
export async function addTaskComment(taskId: string, text: string) {
  const session = await requireSession();
  const trimmed = text.trim();
  if (!trimmed) return { error: "EMPTY" as const };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "NOT_FOUND" as const };

  // бригадир — лише свої задачі; адмін/директор/бухгалтер — будь-які
  if (session.user.role === "BRIGADE_LEADER" && !canTouchTask(session as any, task)) {
    return { error: "FORBIDDEN" as const };
  }

  await prisma.taskComment.create({
    data: {
      taskId,
      userId: session.user.id,
      kind: session.user.role === "BRIGADE_LEADER" ? "QUESTION" : "COMMENT",
      text: trimmed,
    },
  });
  notifyTaskComment(taskId, session.user.id, trimmed).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true as const };
}
