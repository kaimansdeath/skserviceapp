import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toYmd } from "@/lib/dates";
import TaskForm from "@/components/tasks/TaskForm";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/tasks/${params.id}`);

  const [task, clients, brigades] = await Promise.all([
    prisma.task.findUnique({ where: { id: params.id } }),
    prisma.client.findMany({ include: { machines: true }, orderBy: { name: "asc" } }),
    prisma.brigade.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!task) notFound();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("tasks.edit")}</h1>
      <TaskForm
        isAdmin
        clients={clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          city: c.city,
          oblast: c.oblast,
          machines: c.machines.map((m: any) => ({
            id: m.id,
            label: `${m.model}${m.serialNumber ? ` (${m.serialNumber})` : ""}`,
          })),
        }))}
        brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
        initial={{
          id: task.id,
          executorType: task.executorType as any,
          brigadeId: task.brigadeId,
          outsourceName: task.outsourceName,
          orderNumber: task.orderNumber,
          clientId: task.clientId,
          machineId: task.machineId,
          city: task.city,
          oblast: task.oblast,
          invoiceNumber: task.invoiceNumber,
          note: task.note,
          dateFrom: toYmd(task.dateFrom),
          dateTo: toYmd(task.dateTo),
          status: task.status as any,
          failureReason: task.failureReason,
        }}
      />
    </div>
  );
}
