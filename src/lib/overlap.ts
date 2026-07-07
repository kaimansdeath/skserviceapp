import { prisma } from "@/lib/prisma";

/**
 * Перетин дат з іншими незавершеними задачами тієї ж бригади.
 * Попередження, не блокування.
 */
export async function findOverlaps(params: {
  brigadeId: string;
  dateFrom: Date;
  dateTo: Date;
  excludeTaskId?: string;
}) {
  return prisma.task.findMany({
    where: {
      brigadeId: params.brigadeId,
      ...(params.excludeTaskId ? { id: { not: params.excludeTaskId } } : {}),
      status: { notIn: ["DONE", "NOT_DONE"] },
      dateFrom: { lte: params.dateTo },
      dateTo: { gte: params.dateFrom },
    },
    include: { client: { select: { name: true } } },
    orderBy: { dateFrom: "asc" },
    take: 10,
  });
}
