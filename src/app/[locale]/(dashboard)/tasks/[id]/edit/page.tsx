import { getTranslations, getLocale } from "next-intl/server";
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

  const locale = await getLocale();
  const [task, clients, staff, machineTypes] = await Promise.all([
    prisma.task.findUnique({
      where: { id: params.id },
      include: { machines: true, assignees: { select: { id: true } } },
    }),
    prisma.client.findMany({
      include: { machines: true, invoices: { orderBy: { createdAt: "desc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["BRIGADE_LEADER", "BRIGADE_MEMBER"] }, isActive: true },
      include: { brigade: true },
      orderBy: [{ brigadeId: "asc" }, { role: "asc" }, { name: "asc" }],
    }),
    prisma.machineType.findMany({ orderBy: { nameUk: "asc" } }),
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
          invoices: c.invoices.map((i: any) => ({ id: i.id, number: i.number })),
        }))}
        staff={staff.map((u: any) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          brigadeId: u.brigadeId,
          brigadeName: u.brigade?.name ?? null,
        }))}
        machineTypes={machineTypes.map((tp: any) => ({
          id: tp.id,
          name: locale === "ru" ? tp.nameRu : tp.nameUk,
        }))}
        initial={{
          id: task.id,
          taskType: task.taskType as any,
          executorType: task.executorType as any,
          assigneeIds: task.assignees.map((a: any) => a.id),
          outsourceName: task.outsourceName,
          orderNumber: task.orderNumber,
          clientId: task.clientId,
          machineIds: task.machines.map((m: any) => m.id),
          city: task.city,
          oblast: task.oblast,
          invoiceId: task.invoiceId,
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
