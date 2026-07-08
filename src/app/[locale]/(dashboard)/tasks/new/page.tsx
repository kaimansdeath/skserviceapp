import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TaskForm from "@/components/tasks/TaskForm";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/tasks`);

  const locale = await getLocale();
  const [clients, brigades, machineTypes] = await Promise.all([
    prisma.client.findMany({
      include: { machines: { include: { type: true } }, invoices: { orderBy: { createdAt: "desc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.brigade.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.machineType.findMany({ orderBy: { nameUk: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("tasks.new")}</h1>
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
        brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
        machineTypes={machineTypes.map((tp: any) => ({
          id: tp.id,
          name: locale === "ru" ? tp.nameRu : tp.nameUk,
        }))}
      />
    </div>
  );
}
