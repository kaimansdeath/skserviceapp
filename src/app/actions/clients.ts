"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

const clientInput = z.object({
  name: z.string().min(1),
  edrpou: z.string().optional().nullable(),
  city: z.string().min(1),
  oblast: z.string().min(1),
  managerId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function saveClient(id: string | null, input: z.infer<typeof clientInput>) {
  await requireAdmin();
  const data = clientInput.parse(input);
  const payload = {
    name: data.name.trim(),
    edrpou: data.edrpou?.trim() || null,
    city: data.city.trim(),
    oblast: data.oblast.trim(),
    managerId: data.managerId || null,
    note: data.note?.trim() || null,
  };
  const client = id
    ? await prisma.client.update({ where: { id }, data: payload })
    : await prisma.client.create({ data: payload });
  revalidatePath("/", "layout");
  return { ok: true as const, id: client.id };
}

const machineInput = z.object({
  clientId: z.string().min(1),
  typeId: z.string().min(1),
  model: z.string().min(1),
  serialNumber: z.string().optional().nullable(),
  warrantyMonths: z.number().int().min(1).max(120).default(12),
  note: z.string().optional().nullable(),
});

export async function saveMachine(id: string | null, input: z.infer<typeof machineInput>) {
  await requireAdmin();
  const data = machineInput.parse(input);
  const payload = {
    clientId: data.clientId,
    typeId: data.typeId,
    model: data.model.trim(),
    serialNumber: data.serialNumber?.trim() || null,
    warrantyMonths: data.warrantyMonths,
    note: data.note?.trim() || null,
  };
  const machine = id
    ? await prisma.machine.update({ where: { id }, data: payload })
    : await prisma.machine.create({ data: payload });
  revalidatePath("/", "layout");
  return { ok: true as const, id: machine.id };
}

export async function addMachineType(nameUk: string, nameRu: string) {
  await requireAdmin();
  if (!nameUk.trim() || !nameRu.trim()) return { error: "EMPTY" as const };
  await prisma.machineType.upsert({
    where: { nameUk: nameUk.trim() },
    update: { nameRu: nameRu.trim() },
    create: { nameUk: nameUk.trim(), nameRu: nameRu.trim() },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// --- Контактні особи клієнта ---

export async function addClientContact(input: {
  clientId: string;
  position?: string | null;
  fullName: string;
  phone?: string | null;
}) {
  await requireAdmin();
  if (!input.fullName.trim()) return { error: "EMPTY" as const };
  await prisma.clientContact.create({
    data: {
      clientId: input.clientId,
      position: input.position?.trim() || null,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteClientContact(contactId: string) {
  await requireAdmin();
  await prisma.clientContact.delete({ where: { id: contactId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// --- Рахунки клієнта ---

export async function addInvoice(clientId: string, number: string) {
  await requireAdmin();
  const trimmed = number.trim();
  if (!trimmed) return { error: "EMPTY" as const };
  const invoice = await prisma.invoice.upsert({
    where: { clientId_number: { clientId, number: trimmed } },
    update: {},
    create: { clientId, number: trimmed },
  });
  revalidatePath("/", "layout");
  return { ok: true as const, id: invoice.id, number: trimmed };
}

export async function deleteInvoice(invoiceId: string) {
  await requireAdmin();
  const count = await prisma.task.count({ where: { invoiceId } });
  if (count > 0) return { error: "HAS_TASKS" as const };
  await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// --- Видалення верстатів та клієнтів (із захистом історії) ---

export async function deleteMachine(machineId: string) {
  await requireAdmin();
  const count = await prisma.task.count({ where: { machines: { some: { id: machineId } } } });
  if (count > 0) return { error: "HAS_TASKS" as const };
  await prisma.machine.delete({ where: { id: machineId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteClient(clientId: string) {
  await requireAdmin();
  const tasks = await prisma.task.count({ where: { clientId } });
  if (tasks > 0) return { error: "HAS_TASKS" as const };
  await prisma.$transaction([
    prisma.machine.deleteMany({ where: { clientId } }),
    prisma.invoice.deleteMany({ where: { clientId } }),
    prisma.client.delete({ where: { id: clientId } }), // контакти видаляться каскадно
  ]);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// --- Менеджери (довідник) ---

export async function addManager(name: string) {
  await requireAdmin();
  if (!name.trim()) return { error: "EMPTY" as const };
  await prisma.manager.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteManager(managerId: string) {
  await requireAdmin();
  // клієнти не видаляються — закріплення знімається (FK SET NULL)
  await prisma.manager.delete({ where: { id: managerId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Передати всіх клієнтів одного менеджера іншому (напр., при звільненні) */
export async function transferManagerClients(fromManagerId: string, toManagerId: string) {
  await requireAdmin();
  if (fromManagerId === toManagerId) return { error: "SAME" as const };
  const res = await prisma.client.updateMany({
    where: { managerId: fromManagerId },
    data: { managerId: toManagerId },
  });
  revalidatePath("/", "layout");
  return { ok: true as const, count: res.count };
}
