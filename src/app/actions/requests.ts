"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

/** Закрити заявку вручну (опрацьована без створення задачі) */
export async function closeRequest(requestId: string) {
  await requireAdmin();
  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: "CLOSED" },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Видалити заявку назавжди */
export async function deleteRequest(requestId: string) {
  await requireAdmin();
  await prisma.serviceRequest.delete({ where: { id: requestId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const manualInput = z.object({
  serialNumber: z.string().optional().nullable(),
  machineTypeText: z.string().optional().nullable(),
  modelText: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  problem: z.string().min(1),
});

export type ManualRequestInput = z.infer<typeof manualInput>;

/** Ручна заявка з веб-інтерфейсу (для "висячих" питань, дзвінків тощо) */
export async function addServiceRequest(input: ManualRequestInput) {
  await requireAdmin();
  const parsed = manualInput.safeParse(input);
  if (!parsed.success) return { error: "VALIDATION" as const };
  const data = parsed.data;

  const serial = data.serialNumber?.trim() || "";
  let machineId: string | null = null;
  let clientId: string | null = null;
  if (serial) {
    const machine = await prisma.machine.findFirst({
      where: { serialNumber: { equals: serial, mode: "insensitive" } },
    });
    if (machine) {
      machineId = machine.id;
      clientId = machine.clientId;
    }
  }

  await prisma.serviceRequest.create({
    data: {
      serialNumber: serial,
      machineId,
      clientId,
      machineTypeText: data.machineTypeText?.trim() || null,
      modelText: data.modelText?.trim() || null,
      contactName: data.contactName?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
      problem: data.problem.trim(),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
