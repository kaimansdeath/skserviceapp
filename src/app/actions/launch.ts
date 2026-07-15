"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { notifyLaunchRequest } from "@/lib/telegram";

const launchInput = z.object({
  managerId: z.string().min(1),
  clientName: z.string().min(1),
  contactInfo: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  machineText: z.string().min(1),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: z.string().optional().nullable(),
});

export type LaunchInput = z.infer<typeof launchInput>;

/** Публічна дія: заявка на запуск верстата (форма для менеджерів, без входу) */
export async function createLaunchRequest(input: LaunchInput) {
  const parsed = launchInput.safeParse(input);
  if (!parsed.success) return { error: "VALIDATION" as const };
  const data = parsed.data;

  const req = await prisma.launchRequest.create({
    data: {
      managerId: data.managerId,
      clientName: data.clientName.trim(),
      contactInfo: data.contactInfo?.trim() || null,
      city: data.city?.trim() || null,
      machineText: data.machineText.trim(),
      desiredDate: data.desiredDate ? new Date(`${data.desiredDate}T00:00:00.000Z`) : null,
      note: data.note?.trim() || null,
    },
  });
  notifyLaunchRequest(req.id).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true as const, number: req.number as number };
}

export async function closeLaunchRequest(requestId: string) {
  await requireAdmin();
  await prisma.launchRequest.update({ where: { id: requestId }, data: { status: "CLOSED" } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteLaunchRequest(requestId: string) {
  await requireAdmin();
  await prisma.launchRequest.delete({ where: { id: requestId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
