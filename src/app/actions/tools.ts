"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { notifyToolRequestResolved } from "@/lib/telegram";

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
  inventoryNumber: z.string().optional().nullable(),
  toolClass: z.enum(["HAND", "ELECTRIC", "MEASURING", "TOOLING", "MODULES"]),
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
      inventoryNumber: data.inventoryNumber?.trim() || null,
      toolClass: data.toolClass,
      note: data.note?.trim() || null,
    },
  });
  await prisma.toolMovement.create({
    data: { toolId: tool.id, byUserId: session.user.id, text: "Додано. Розміщення: склад" },
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

export type ToolTarget =
  | { type: "WAREHOUSE" }
  | { type: "BRIGADE"; id: string }
  | { type: "PERSON"; id: string };

async function holderLabel(tool: {
  holderBrigadeId: string | null;
  holderUserId: string | null;
}): Promise<string> {
  if (tool.holderBrigadeId) {
    const b = await prisma.brigade.findUnique({ where: { id: tool.holderBrigadeId } });
    return b?.name ?? "?";
  }
  if (tool.holderUserId) {
    const u = await prisma.user.findUnique({ where: { id: tool.holderUserId } });
    return u?.name ?? "?";
  }
  return "склад";
}

/** Переміщення інструменту: склад ↔ бригада ↔ особа */
export async function moveTool(toolId: string, target: ToolTarget) {
  const session = await requireToolManager();
  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool) return { error: "NOT_FOUND" as const };

  const from = await holderLabel(tool);

  let data: any;
  let toLabel: string;
  if (target.type === "WAREHOUSE") {
    data = { holderBrigadeId: null, holderUserId: null };
    toLabel = "склад";
  } else if (target.type === "BRIGADE") {
    const b = await prisma.brigade.findUnique({ where: { id: target.id } });
    if (!b) return { error: "NOT_FOUND" as const };
    data = { holderBrigadeId: b.id, holderUserId: null };
    toLabel = b.name;
  } else {
    const u = await prisma.user.findUnique({ where: { id: target.id } });
    if (!u) return { error: "NOT_FOUND" as const };
    data = { holderBrigadeId: null, holderUserId: u.id };
    toLabel = u.name;
  }

  if (from === toLabel) return { ok: true as const };

  await prisma.tool.update({ where: { id: toolId }, data });
  await prisma.toolMovement.create({
    data: { toolId, byUserId: session.user.id, text: `Переміщення: ${from} → ${toLabel}` },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Закрити заявку на закупку/видачу */
export async function resolveToolRequest(requestId: string, status: "DONE" | "REJECTED") {
  const session = await requireToolManager();
  const req = await prisma.toolRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "NOT_FOUND" as const };
  // закупку закриває керівник; видачу — комірник або керівник
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
