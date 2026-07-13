"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import {
  notifyToolRequestResolved,
  notifyToolRequestCreated,
  notifyIssueApproved,
} from "@/lib/telegram";

/** Керувати інструментом можуть лише керівник відділу та комірник */
async function requireToolManager() {
  const session = await requireSession();
  if (!["ADMIN", "STOREKEEPER"].includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

const toolInput = z.object({
  name: z.string().min(1),
  manufacturer: z.string().optional().nullable(),
  inventoryNumber: z.string().optional().nullable(),
  toolClass: z.enum([
    "HAND",
    "ELECTRIC",
    "MEASURING",
    "TOOLING",
    "MODULES",
    "ZIP",
    "CONSUMABLES",
    "OTHER",
  ]),
  quantity: z.number().int().min(1).default(1),
  note: z.string().optional().nullable(),
});

export type ToolInput = z.infer<typeof toolInput>;

export async function addTool(input: ToolInput) {
  const session = await requireToolManager();
  const parsed = toolInput.safeParse(input);
  if (!parsed.success) return { error: "VALIDATION" as const };
  const data = parsed.data;

  const tool = await prisma.tool.create({
    data: {
      name: data.name.trim(),
      manufacturer: data.manufacturer?.trim() || null,
      inventoryNumber: data.inventoryNumber?.trim() || null,
      toolClass: data.toolClass,
      quantity: data.quantity,
      note: data.note?.trim() || null,
      allocations: { create: { holderKind: "WAREHOUSE", quantity: data.quantity } },
    },
  });
  await prisma.toolMovement.create({
    data: {
      toolId: tool.id,
      byUserId: session.user.id,
      text: `Додано. Кількість: ${data.quantity}. Розміщення: склад`,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const, id: tool.id };
}

/** Видалення — лише керівник відділу */
export async function deleteTool(toolId: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") return { error: "FORBIDDEN" as const };
  await prisma.tool.delete({ where: { id: toolId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const STATUS_LABEL: Record<string, string> = {
  WORKING: "робочий",
  BROKEN: "зламаний",
  LOST: "втрачений",
};

export async function setToolStatus(toolId: string, status: "WORKING" | "BROKEN" | "LOST") {
  const session = await requireToolManager();
  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool) return { error: "NOT_FOUND" as const };
  if (tool.status === status) return { ok: true as const };
  await prisma.tool.update({ where: { id: toolId }, data: { status } });
  await prisma.toolMovement.create({
    data: {
      toolId,
      byUserId: session.user.id,
      text: `Статус: ${STATUS_LABEL[tool.status]} → ${STATUS_LABEL[status]}`,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export type AllocationRow = {
  key: string; // "w" | "b:<id>" | "p:<id>"
  quantity: number;
};

async function holderName(kind: string, brigadeId: string | null, userId: string | null) {
  if (kind === "BRIGADE" && brigadeId) {
    const b = await prisma.brigade.findUnique({ where: { id: brigadeId } });
    return b?.name ?? "?";
  }
  if (kind === "PERSON" && userId) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    return u?.name ?? "?";
  }
  return "склад";
}

async function labelOfKey(key: string): Promise<string> {
  if (key === "w") return "склад";
  const [k, id] = key.split(":");
  return holderName(k === "b" ? "BRIGADE" : "PERSON", k === "b" ? id : null, k === "p" ? id : null);
}

/**
 * Перерозподілити кількість інструменту по місцях.
 * rows — повний новий стан (склад + обрані бригади/люди), сума має дорівнювати tool.quantity.
 */
export async function distributeTool(toolId: string, rows: AllocationRow[]) {
  const session = await requireToolManager();
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { allocations: true },
  });
  if (!tool) return { error: "NOT_FOUND" as const };

  const filtered = rows.filter((r) => r.quantity > 0);
  const total = filtered.reduce((sum, r) => sum + r.quantity, 0);
  if (total !== tool.quantity) return { error: "QUANTITY_MISMATCH" as const };

  const before = new Map<string, number>(
    (tool.allocations as any[]).map((a) => [
      a.holderKind === "WAREHOUSE" ? "w" : a.holderKind === "BRIGADE" ? `b:${a.brigadeId}` : `p:${a.userId}`,
      a.quantity as number,
    ])
  );

  const journalLines: string[] = [];
  for (const key of new Set([...before.keys(), ...filtered.map((r) => r.key)])) {
    const prevQ = before.get(key) ?? 0;
    const newQ = filtered.find((r) => r.key === key)?.quantity ?? 0;
    if (prevQ !== newQ) {
      const label = await labelOfKey(key);
      journalLines.push(`${label}: ${prevQ} → ${newQ}`);
    }
  }

  await prisma.$transaction([
    prisma.toolAllocation.deleteMany({ where: { toolId } }),
    prisma.toolAllocation.createMany({
      data: filtered.map((r) => {
        if (r.key === "w") return { toolId, holderKind: "WAREHOUSE" as const, quantity: r.quantity };
        const [k, id] = r.key.split(":");
        return k === "b"
          ? { toolId, holderKind: "BRIGADE" as const, brigadeId: id, quantity: r.quantity }
          : { toolId, holderKind: "PERSON" as const, userId: id, quantity: r.quantity };
      }),
    }),
  ]);

  if (journalLines.length > 0) {
    await prisma.toolMovement.create({
      data: {
        toolId,
        byUserId: session.user.id,
        text: `Перерозподіл: ${journalLines.join("; ")}`,
      },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Змінити загальну кількість позиції (різниця йде на склад) */
export async function setToolQuantity(toolId: string, quantity: number) {
  const session = await requireToolManager();
  if (quantity < 0) return { error: "VALIDATION" as const };
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { allocations: true },
  });
  if (!tool) return { error: "NOT_FOUND" as const };

  const distributed = (tool.allocations as any[])
    .filter((a) => a.holderKind !== "WAREHOUSE")
    .reduce((s, a) => s + a.quantity, 0);
  if (quantity < distributed) return { error: "BELOW_DISTRIBUTED" as const };

  const warehouseQty = quantity - distributed;
  const existingWarehouse = (tool.allocations as any[]).find((a) => a.holderKind === "WAREHOUSE");

  await prisma.$transaction([
    prisma.tool.update({ where: { id: toolId }, data: { quantity } }),
    existingWarehouse
      ? prisma.toolAllocation.update({
          where: { id: existingWarehouse.id },
          data: { quantity: warehouseQty },
        })
      : prisma.toolAllocation.create({
          data: { toolId, holderKind: "WAREHOUSE", quantity: warehouseQty },
        }),
  ]);
  await prisma.toolMovement.create({
    data: {
      toolId,
      byUserId: session.user.id,
      text: `Загальна кількість: ${tool.quantity} → ${quantity}`,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Закрити заявку на закупку/видачу */
export async function resolveToolRequest(requestId: string, status: "DONE" | "REJECTED") {
  const session = await requireToolManager();
  const req = await prisma.toolRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "NOT_FOUND" as const };
  if (req.kind === "PURCHASE" && session.user.role !== "ADMIN") {
    return { error: "FORBIDDEN" as const };
  }
  await prisma.toolRequest.update({
    where: { id: requestId },
    data: { status, resolvedById: session.user.id, resolvedAt: new Date() },
  });
  notifyToolRequestResolved(requestId, status).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Нова заявка з веб-інтерфейсу (бригадир / керівник / комірник) */
export async function addToolRequest(kind: "PURCHASE" | "ISSUE", text: string) {
  const session = await requireSession();
  if (!["ADMIN", "BRIGADE_LEADER", "STOREKEEPER"].includes(session.user.role)) {
    return { error: "FORBIDDEN" as const };
  }
  if (!text.trim()) return { error: "EMPTY" as const };
  const req = await prisma.toolRequest.create({
    data: { kind, text: text.trim(), requestedById: session.user.id },
  });
  notifyToolRequestCreated(req.id).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Погодження видачі керівником → комірник отримує завдання видати */
export async function approveToolRequest(requestId: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") return { error: "FORBIDDEN" as const };
  const req = await prisma.toolRequest.findUnique({ where: { id: requestId } });
  if (!req || req.kind !== "ISSUE" || req.status !== "NEW") {
    return { error: "NOT_FOUND" as const };
  }
  await prisma.toolRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } });
  notifyIssueApproved(requestId).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true as const };
}
