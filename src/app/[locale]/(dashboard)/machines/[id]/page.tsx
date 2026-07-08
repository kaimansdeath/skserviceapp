import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa } from "@/lib/dates";
import { Link } from "@/i18n/routing";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

/** Картка верстата з повною історією виїздів — ключова функція розділу */
export default async function MachinePage({ params }: { params: { id: string } }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = (await auth())!;
  const isAdmin = session.user.role === "ADMIN";

  const machine = await prisma.machine.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      type: true,
      tasks: {
        include: { brigade: true },
        orderBy: { dateFrom: "desc" },
      },
    },
  });
  if (!machine) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{machine.model}</h1>
          <p className="text-sm text-neutral-500">
            {locale === "ru" ? machine.type.nameRu : machine.type.nameUk}
            {machine.serialNumber ? ` · S/N ${machine.serialNumber}` : ""} ·{" "}
            <Link href={`/clients/${machine.clientId}`} className="text-brand-dark hover:underline">
              {machine.client.name}
            </Link>
          </p>
          {machine.note && <p className="mt-1 text-sm text-neutral-600">{machine.note}</p>}
        </div>
        {isAdmin && (
          <Link
            href={`/machines/${machine.id}/edit`}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
          >
            {t("common.edit")}
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("machines.history")}</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">{t("machines.historyCols.dates")}</th>
                <th className="px-3 py-2">{t("machines.historyCols.brigade")}</th>
                <th className="px-3 py-2">{t("machines.historyCols.invoice")}</th>
                <th className="px-3 py-2">{t("machines.historyCols.result")}</th>
                <th className="px-3 py-2">{t("machines.historyCols.note")}</th>
              </tr>
            </thead>
            <tbody>
              {machine.tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-neutral-400">
                    {t("machines.historyEmpty")}
                  </td>
                </tr>
              )}
              {machine.tasks.map((task: any) => (
                <tr key={task.id} className="border-b border-neutral-100 last:border-0 align-top">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/tasks/${task.id}`} className="text-brand-dark hover:underline">
                      {formatDateUa(task.dateFrom)} — {formatDateUa(task.dateTo)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {task.executorType === "OUTSOURCE"
                      ? `${t("tasks.executor.OUTSOURCE")}: ${task.outsourceName ?? "—"}`
                      : task.brigade?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2">{task.invoiceNumber ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={task.status} />
                    {task.failureReason && (
                      <p className="mt-1 text-xs text-red-600">{task.failureReason}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{task.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
