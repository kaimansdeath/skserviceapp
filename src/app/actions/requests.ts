"use server";

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
