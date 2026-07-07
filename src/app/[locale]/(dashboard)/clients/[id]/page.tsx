import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa } from "@/lib/dates";
import { Link } from "@/i18n/routing";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: { id: string } }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = (await auth())!;
  const isAdmin = session.user.role === "ADMIN";

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      machines: { include: { type: true }, orderBy: { model: "asc" } },
      tasks: {
        include: { brigade: true, machine: true },
        orderBy: { dateFrom: "desc" },
        take: 50,
      },
    },
  });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{client.name}</h1>
          <p className="text-sm text-neutral-500">
            {client.city}, {client.oblast}
            {client.contacts ? ` · ${client.contacts}` : ""}
          </p>
          {client.note && <p className="mt-1 text-sm text-neutral-600">{client.note}</p>}
        </div>
        {isAdmin && (
          <Link
            href={`/clients/${client.id}/edit`}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
          >
            {t("common.edit")}
          </Link>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">{t("clients.machines")}</h2>
          {isAdmin && (
            <Link
              href={`/clients/${client.id}/machines/new`}
              className="text-sm font-semibold text-brand-dark hover:underline"
            >
              + {t("clients.addMachine")}
            </Link>
          )}
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">{t("machines.fields.model")}</th>
                <th className="px-3 py-2">{t("machines.fields.type")}</th>
                <th className="px-3 py-2">{t("machines.fields.serial")}</th>
              </tr>
            </thead>
            <tbody>
              {client.machines.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-neutral-400">
                    {t("clients.noMachines")}
                  </td>
                </tr>
              )}
              {client.machines.map((m: any) => (
                <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/machines/${m.id}`} className="font-medium text-brand-dark hover:underline">
                      {m.model}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{locale === "ru" ? m.type.nameRu : m.type.nameUk}</td>
                  <td className="px-3 py-2 text-neutral-500">{m.serialNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("clients.clientTasks")}</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">{t("machines.historyCols.dates")}</th>
                <th className="px-3 py-2">{t("machines.historyCols.brigade")}</th>
                <th className="px-3 py-2">{t("tasks.fields.machine")}</th>
                <th className="px-3 py-2">{t("machines.historyCols.invoice")}</th>
                <th className="px-3 py-2">{t("machines.historyCols.result")}</th>
              </tr>
            </thead>
            <tbody>
              {client.tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                    {t("tasks.empty")}
                  </td>
                </tr>
              )}
              {client.tasks.map((task: any) => (
                <tr key={task.id} className="border-b border-neutral-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/tasks/${task.id}`} className="text-brand-dark hover:underline">
                      {formatDateUa(task.dateFrom)} — {formatDateUa(task.dateTo)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{task.brigade.name}</td>
                  <td className="px-3 py-2 text-neutral-500">{task.machine?.model ?? "—"}</td>
                  <td className="px-3 py-2">{task.invoiceNumber ?? "—"}</td>
                  <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
