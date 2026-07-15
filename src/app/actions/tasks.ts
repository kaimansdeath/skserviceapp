"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/authz";
import { applyStatusChange } from "@/lib/taskService";
import { findOverlaps } from "@/lib/overlap";
import { REASON_STATUSES, type TaskStatusValue } from "@/lib/taskStatus";
import { dateFieldFromYmd, toYmd } from "@/lib/dates";
import {
  notifyTaskAssigned,
  notifyTaskComment,
  notifyMembersConfirmed,
  notifyRequesterAccepted,
} from "@/lib/telegram";
import { canTouchTask } from "@/lib/authz";

const taskInput = z
  .object({
    taskType: z
      .enum(["ENGINEERING", "PNR", "REPAIR", "DEFECTATION", "VISIT", "OTHER"])
      .default("OTHER"),
    executorType: z.enum(["BRIGADE", "OUTSOURCE"]).default("BRIGADE"),
    assigneeIds: z.array(z.string()).default([]),
    requestId: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
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
  .refine(
    (d) => (d.executorType === "BRIGADE" ? d.assigneeIds.length > 0 : !!d.outsourceName?.trim()),
    { message: "EXECUTOR_REQUIRED" }
  );

export type TaskInput = z.infer<typeof taskInput>;

/** З обраних людей визначаємо бригади задачі; вимагаємо хоча б одного бригадира */
async function resolveAssignees(assigneeIds: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: assigneeIds }, isActive: true },
    select: { id: true, role: true, brigadeId: true },
  });
  // підтверджує задачу бригадир або керівник відділу
  const leaders = users.filter((u: any) =>
    ["BRIGADE_LEADER", "ADMIN"].includes(u.role)
  );
  if (leaders.length === 0) return { error: "LEADER_REQUIRED" as const };
  const brigadeIds: string[] = [];
  for (const u of users as any[]) {
    if (u.brigadeId && !brigadeIds.includes(u.brigadeId)) brigadeIds.push(u.brigadeId);
  }
  return {
    ok: true as const,
    ids: users.map((u: any) => u.id as string),
    brigadeId: brigadeIds[0] ?? null,
    secondBrigadeId: brigadeIds[1] ?? null,
  };
}

export async function createTask(input: TaskInput) {
  const session = await requireAdmin();
  const data = taskInput.parse(input);
  if (data.dateTo < data.dateFrom) return { error: "DATE_RANGE" as const };

  let resolved: Awaited<ReturnType<typeof resolveAssignees>> | null = null;
  if (data.executorType === "BRIGADE") {
    resolved = await resolveAssignees(data.assigneeIds);
    if ("error" in resolved) return { error: "LEADER_REQUIRED" as const };
  }

  const task = await prisma.task.create({
    data: {
      taskType: data.taskType,
      executorType: data.executorType,
      brigadeId: resolved && "ok" in resolved ? resolved.brigadeId : null,
      secondBrigadeId: resolved && "ok" in resolved ? resolved.secondBrigadeId : null,
      assignees:
        resolved && "ok" in resolved
          ? { connect: resolved.ids.map((id: string) => ({ id })) }
          : undefined,
      outsourceName: data.executorType === "OUTSOURCE" ? data.outsourceName!.trim() : null,
      clientId: data.clientId,
      machines: data.machineIds.length
        ? { connect: data.machineIds.map((id) => ({ id })) }
        : undefined,
      city: data.city.trim(),
      oblast: data.oblast.trim(),
      address: data.address?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
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
  // задача створена із заявки — закриваємо заявку та повідомляємо заявника
  if (data.requestId) {
    await prisma.serviceRequest
      .update({ where: { id: data.requestId }, data: { status: "CLOSED", taskId: task.id } })
      .catch(() => {});
    notifyRequesterAccepted(data.requestId).catch(() => {});
  }

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

  let resolved: Awaited<ReturnType<typeof resolveAssignees>> | null = null;
  if (data.executorType === "BRIGADE") {
    resolved = await resolveAssignees(data.assigneeIds);
    if ("error" in resolved) return { error: "LEADER_REQUIRED" as const };
  }
  const newBrigadeId = resolved && "ok" in resolved ? resolved.brigadeId : null;
  const brigadeChanged = newBrigadeId !== existing.brigadeId && newBrigadeId !== null;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      taskType: data.taskType,
      executorType: data.executorType,
      brigadeId: newBrigadeId,
      secondBrigadeId: resolved && "ok" in resolved ? resolved.secondBrigadeId : null,
      assignees: {
        set: resolved && "ok" in resolved ? resolved.ids.map((id: string) => ({ id })) : [],
      },
      outsourceName: data.executorType === "OUTSOURCE" ? data.outsourceName!.trim() : null,
      clientId: data.clientId,
      machines: { set: data.machineIds.map((id) => ({ id })) },
      city: data.city.trim(),
      oblast: data.oblast.trim(),
      address: data.address?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
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
  if (params.to === "CONFIRMED") notifyMembersConfirmed(params.taskId).catch(() => {});
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
