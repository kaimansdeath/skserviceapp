import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa, kyivToday } from "@/lib/dates";
import { warrantyEnd, DEFAULT_COMMISSIONING } from "@/lib/warranty";
import { Link } from "@/i18n/routing";
import MachinesFilters from "@/components/machines/MachinesFilters";

export const dynamic = "force-dynamic";

/**
 * Верстати: плоска таблиця з датою введення в експлуатацію
 * (останній день виконаної задачі ПНР; якщо ПНР невідомий — 01.01.2024)
 * та датою закінчення гарантії (прострочена — червоним).
 */
export default async function MachinesPage({
  searchParams,
}: {
  searchParams: { type?: string; manager?: string; city?: string };
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const today = kyivToday();
  const session = (await auth())!;
  if (["STOREKEEPER", "BRIGADE_LEADER", "BRIGADE_MEMBER"].includes(session.user.role)) redirect("/");
  const isAdmin = session.user.role === "ADMIN";

  const clientFilter: any = {};
  if (searchParams.manager) clientFilter.managerId = searchParams.manager;
  if (searchParams.city) clientFilter.city = { contains: searchParams.city, mode: "insensitive" };

  const [machines, pnrTasks, types, managers] = await Promise.all([
    prisma.machine.findMany({
      where: {
        ...(searchParams.type ? { typeId: searchParams.type } : {}),
        ...(Object.keys(clientFilter).length ? { client: clientFilter } : {}),
      },
      include: { type: true, client: true },
      orderBy: { model: "asc" },
    }),
    prisma.task.findMany({
      where: { taskType: "PNR", status: "DONE" },
      select: { dateTo: true, machines: { select: { id: true } } },
      orderBy: { dateTo: "desc" },
    }),
    prisma.machineType.findMany({ orderBy: { nameUk: "asc" } }),
    prisma.manager.findMany({ orderBy: { name: "asc" } }),
  ]);

  // остання дата завершеного ПНР для кожного верстата
  const commissioningMap = new Map<string, Date>();
  for (const task of pnrTasks as any[]) {
    for (const m of task.machines) {
      if (!commissioningMap.has(m.id)) commissioningMap.set(m.id, task.dateTo);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("machinesList.title")}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">
            {t("machinesList.units", { units: machines.length })}
          </span>
          {isAdmin && (
            <Link
              href="/machines/new"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              + {t("machinesList.addMachine")}
            </Link>
          )}
        </div>
      </div>

      <MachinesFilters
        types={types.map((x: any) => ({ id: x.id, name: locale === "ru" ? x.nameRu : x.nameUk }))}
        managers={managers.map((x: any) => ({ id: x.id, name: x.name }))}
      />

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("machines.fields.model")}</th>
              <th className="px-3 py-2">{t("machines.fields.type")}</th>
              <th className="px-3 py-2">{t("machines.fields.serial")}</th>
              <th className="px-3 py-2">{t("tasks.fields.client")}</th>
              <th className="px-3 py-2">{t("clients.fields.city")}</th>
              <th className="px-3 py-2">{t("machinesList.commissioned")}</th>
              <th className="px-3 py-2">{t("machinesList.warrantyUntil")}</th>
            </tr>
          </thead>
          <tbody>
            {machines.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                  {t("machinesList.empty")}
                </td>
              </tr>
            )}
            {machines.map((m: any) => {
              const pnrDate = commissioningMap.get(m.id);
              const commissioning = pnrDate ?? DEFAULT_COMMISSIONING;
              const wEnd = warrantyEnd(commissioning, m.warrantyMonths);
              const expired = wEnd < today;
              return (
                <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/machines/${m.id}`} className="font-medium text-brand-dark hover:underline">
                      {m.model}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {locale === "ru" ? m.type.nameRu : m.type.nameUk}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{m.serialNumber ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/clients/${m.clientId}`} className="text-neutral-700 hover:underline">
                      {m.client.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{m.client.city}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDateUa(commissioning)}
                    {!pnrDate && (
                      <span className="ml-1 text-xs text-neutral-400" title={t("machinesList.defaultDateHint")}>
                        *
                      </span>
                    )}
                  </td>
                  <td
                    className={
                      "whitespace-nowrap px-3 py-2 " +
                      (expired ? "font-semibold text-red-600" : "text-neutral-700")
                    }
                  >
                    {formatDateUa(wEnd)}
                    <span className="ml-1 text-xs text-neutral-400">
                      ({m.warrantyMonths} {t("machinesList.months")})
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-400">* {t("machinesList.defaultDateHint")}</p>
    </div>
  );
}
