import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TaskForm from "@/components/tasks/TaskForm";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { request?: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/tasks`);

  const locale = await getLocale();
  const [clients, staff, machineTypes] = await Promise.all([
    prisma.client.findMany({
      include: { machines: { include: { type: true } }, invoices: { orderBy: { createdAt: "desc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["BRIGADE_LEADER", "BRIGADE_MEMBER", "ADMIN"] }, isActive: true },
      include: { brigade: true },
      orderBy: [{ brigadeId: "asc" }, { role: "asc" }, { name: "asc" }],
    }),
    prisma.machineType.findMany({ orderBy: { nameUk: "asc" } }),
  ]);

  // передзаповнення із заявки на виїзд
  let requestInitial: any = undefined;
  if (searchParams.request) {
    const req = await prisma.serviceRequest.findUnique({
      where: { id: searchParams.request },
      include: { client: true },
    });
    if (req && req.status === "NEW" && req.clientId) {
      requestInitial = {
        requestId: req.id,
        clientId: req.clientId,
        machineIds: req.machineId ? [req.machineId] : [],
        taskType: "REPAIR",
        note: req.problem,
        city: (req as any).client?.city ?? "",
        oblast: (req as any).client?.oblast ?? "",
      };
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("tasks.new")}</h1>
      <TaskForm
        isAdmin
        initial={requestInitial}
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
      />
    </div>
  );
}
