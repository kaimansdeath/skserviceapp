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
  contacts: z.string().optional().nullable(),
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
    contacts: data.contacts?.trim() || null,
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
