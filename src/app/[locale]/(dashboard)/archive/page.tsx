import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa, dateFieldFromYmd, archiveCutoff } from "@/lib/dates";
import { Link } from "@/i18n/routing";
import ArchiveFilters from "@/components/archive/ArchiveFilters";

export const dynamic = "force-dynamic";

/**
 * Архів: завершені задачі (Виконано / Виконано не повністю / Не виконано),
 * дата закінчення яких старша за 14 днів.
 */
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: { q?: string; brigade?: string; from?: string; to?: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  const isBrigadier = session.user.role === "BRIGADE_LEADER";
  const brigadeFilter = isBrigadier ? session.user.brigadeId : searchParams.brigade || undefined;
  const q = searchParams.q?.trim();

  const [brigades, tasks] = await Promise.all([
    prisma.brigade.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      where: {
        status: "DONE",
        dateTo: {
          lt: archiveCutoff(),
          ...(searchParams.to ? { lte: dateFieldFromYmd(searchParams.to) } : {}),
        },
        ...(searchParams.from ? { dateFrom: { gte: dateFieldFromYmd(searchParams.from) } } : {}),
        ...(brigadeFilter
          ? { OR: [{ brigadeId: brigadeFilter }, { secondBrigadeId: brigadeFilter }] }
          : {}),
        ...(q
          ? {
              OR: [
                { client: { name: { contains: q, mode: "insensitive" } } },
                { invoice: { number: { contains: q, mode: "insensitive" } } },
                { orderNumber: { contains: q, mode: "insensitive" } },
                { machines: { some: { model: { contains: q, mode: "insensitive" } } } },
                { city: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        brigade: true,
        secondBrigade: true,
        client: true,
        machines: true,
        invoice: true,
      },
      orderBy: { dateTo: "desc" },
      take: 300,
    }),
  ]);

  const canExport = ["ADMIN", "VIEWER", "ACCOUNTANT"].includes(session.user.role);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("archive.title")}</h1>
      </div>
      <p className="mb-4 text-sm text-neutral-500">{t("archive.hint")}</p>

      <ArchiveFilters
        brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
        canExport={canExport}
      />

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("tasks.fields.dates")}</th>
              <th className="px-3 py-2">{t("tasks.fields.taskType")}</th>
              <th className="px-3 py-2">{t("tasks.fields.executor")}</th>
              <th className="px-3 py-2">{t("tasks.fields.client")}</th>
              <th className="px-3 py-2">{t("tasks.fields.machines")}</th>
              <th className="px-3 py-2">{t("tasks.fields.invoice")}</th>
              <th className="px-3 py-2">{t("tasks.fields.orderNumber")}</th>
              <th className="px-3 py-2">{t("archive.result")}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                  {t("archive.empty")}
                </td>
              </tr>
            )}
            {tasks.map((task: any) => (
              <tr key={task.id} className="border-b border-neutral-100 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2">
                  <Link href={`/tasks/${task.id}`} className="font-medium text-brand-dark hover:underline">
                    {formatDateUa(task.dateFrom)} — {formatDateUa(task.dateTo)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                  {t(`taskType.${task.taskType}` as any)}
                </td>
                <td className="px-3 py-2">
                  {task.executorType === "OUTSOURCE"
                    ? `${t("tasks.executor.OUTSOURCE")}: ${task.outsourceName ?? "—"}`
                    : `${task.brigade?.name ?? "—"}${task.secondBrigade ? ` + ${task.secondBrigade.name}` : ""}`}
                </td>
                <td className="px-3 py-2">
                  {task.client.name}
                  <span className="block text-xs text-neutral-400">{task.city}</span>
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {task.machines.length > 0
                    ? task.machines.map((m: any) => m.model).join(", ")
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{task.invoice?.number ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{task.orderNumber ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    title={t(`status.${task.status}` as any)}
                    className="text-lg leading-none"
                  >
                    {task.status === "DONE" ? "✅" : task.status === "PARTIALLY_DONE" ? "🟡" : "❌"}
                  </span>
                  {task.failureReason && (
                    <p className="mt-1 max-w-[220px] text-xs text-neutral-500">{task.failureReason}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
