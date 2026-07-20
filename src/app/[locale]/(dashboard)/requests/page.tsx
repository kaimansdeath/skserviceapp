import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa } from "@/lib/dates";
import { Link } from "@/i18n/routing";
import RequestRowActions from "@/components/requests/RequestRowActions";
import LaunchRowActions from "@/components/launch/LaunchRowActions";
import AddServiceRequestForm from "@/components/requests/AddServiceRequestForm";

export const dynamic = "force-dynamic";

/** Заявки на виїзд — таблиця. Доступ: керівник відділу та директор. */
export default async function RequestsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { tab?: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (!["ADMIN", "VIEWER"].includes(session.user.role)) redirect(`/${params.locale}`);
  const isAdmin = session.user.role === "ADMIN";

  const tab = searchParams.tab === "tg" ? "tg" : "launch";

  const [requests, launches] = await Promise.all([
    prisma.serviceRequest.findMany({
      include: { machine: { include: { type: true } }, client: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.launchRequest.findMany({
      include: { manager: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
    }),
  ]);

  // дати виїзду для заявок на запуск (створені задачі)
  const launchTaskIds = (launches as any[]).map((r) => r.taskId).filter(Boolean) as string[];
  const launchTasks = launchTaskIds.length
    ? await prisma.task.findMany({
        where: { id: { in: launchTaskIds } },
        select: { id: true, dateFrom: true },
      })
    : [];
  const launchDispatch = new Map<string, Date>(launchTasks.map((x: any) => [x.id, x.dateFrom]));

  // дата відправлення бригади = дата початку створеної із заявки задачі
  const taskIds = (requests as any[]).map((r) => r.taskId).filter(Boolean) as string[];
  const tasks = taskIds.length
    ? await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, dateFrom: true },
      })
    : [];
  const dispatch = new Map<string, Date>(tasks.map((x: any) => [x.id, x.dateFrom]));

  const fmt = (d: Date) =>
    new Date(d).toLocaleString("uk-UA", {
      timeZone: "Europe/Kyiv",
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("requests.title")}</h1>
        {isAdmin && tab === "tg" && <AddServiceRequestForm />}
      </div>
      <p className="mb-4 text-sm text-neutral-500">
        {tab === "launch" ? t("requests.launchHint") : t("requests.hint")}
      </p>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
        {(["launch", "tg"] as const).map((tb) => {
          const badge =
            tb === "tg"
              ? (requests as any[]).filter((r) => r.status === "NEW").length
              : (launches as any[]).filter((r) => r.status === "NEW").length;
          return (
            <Link
              key={tb}
              href={`/requests?tab=${tb}`}
              className={
                "rounded-lg px-4 py-2 text-sm font-medium transition " +
                (tab === tb ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-800")
              }
            >
              {t(`requests.tabs.${tb}` as any)}
              {badge > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {tab === "launch" ? (
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("requests.number")}</th>
              <th className="px-3 py-2">{t("requests.received")}</th>
              <th className="px-3 py-2">{t("launch.fields.manager")}</th>
              <th className="px-3 py-2">{t("launch.fields.client")}</th>
              <th className="px-3 py-2">{t("launch.fields.machine")}</th>
              <th className="px-3 py-2">{t("launch.fields.desiredDate")}</th>
              <th className="px-3 py-2">{t("requests.dispatched")}</th>
              <th className="px-3 py-2">{t("requests.statusCol")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {launches.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-neutral-400">
                  {t("requests.empty")}
                </td>
              </tr>
            )}
            {(launches as any[]).map((r) => (
              <tr
                key={r.id}
                className={
                  "border-b border-neutral-100 align-top last:border-0 " +
                  (r.status === "CLOSED" ? "opacity-60" : "")
                }
              >
                <td className="whitespace-nowrap px-3 py-2 font-bold text-neutral-700">№{r.number}</td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{fmt(r.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.manager?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{r.clientName}</span>
                  {(r.contactInfo || r.city) && (
                    <span className="block text-neutral-500">
                      {[r.contactInfo, r.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                </td>
                <td className="max-w-[220px] px-3 py-2">
                  {r.machineText}
                  {r.note && <span className="block text-xs text-neutral-400">{r.note}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.desiredDate ? formatDateUa(r.desiredDate) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.taskId && launchDispatch.has(r.taskId) ? (
                    <Link href={`/tasks/${r.taskId}`} className="text-brand-dark hover:underline">
                      {formatDateUa(launchDispatch.get(r.taskId)!)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                      (r.status === "NEW"
                        ? "bg-brand-orange/15 text-brand-orange"
                        : "bg-neutral-200 text-neutral-600")
                    }
                  >
                    {t(`requests.status.${r.status}` as any)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {isAdmin && (
                    <span className="inline-flex items-center gap-3">
                      {r.status === "NEW" && (
                        <Link
                          href={`/tasks/new?launch=${r.id}`}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
                        >
                          {t("requests.createTask")}
                        </Link>
                      )}
                      <LaunchRowActions requestId={r.id} status={r.status} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("requests.number")}</th>
              <th className="px-3 py-2">{t("requests.received")}</th>
              <th className="px-3 py-2">S/N</th>
              <th className="px-3 py-2">{t("requests.machineClient")}</th>
              <th className="px-3 py-2">{t("requests.problem")}</th>
              <th className="px-3 py-2">{t("requests.dispatched")}</th>
              <th className="px-3 py-2">{t("requests.statusCol")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                  {t("requests.empty")}
                </td>
              </tr>
            )}
            {requests.map((r: any) => (
              <tr
                key={r.id}
                className={
                  "border-b border-neutral-100 align-top last:border-0 " +
                  (r.status === "CLOSED" ? "opacity-60" : "")
                }
              >
                <td className="whitespace-nowrap px-3 py-2 font-bold text-neutral-700">
                  №{r.number}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{fmt(r.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.serialNumber || "—"}</td>
                <td className="px-3 py-2">
                  {r.machine ? (
                    <>
                      <Link
                        href={`/machines/${r.machine.id}`}
                        className="font-medium text-brand-dark hover:underline"
                      >
                        {r.machine.model}
                      </Link>
                      {r.client && (
                        <span className="block text-neutral-500">
                          <Link href={`/clients/${r.client.id}`} className="hover:underline">
                            {r.client.name}
                          </Link>
                          , {r.client.city}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {[r.machineTypeText, r.modelText].filter(Boolean).join(" · ") || "—"}
                      {(r.contactName || r.contactPhone) && (
                        <span className="block text-neutral-500">
                          {[r.contactName, r.contactPhone].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="max-w-[280px] whitespace-pre-wrap px-3 py-2 text-neutral-700">
                  {r.problem}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.taskId && dispatch.has(r.taskId) ? (
                    <Link href={`/tasks/${r.taskId}`} className="text-brand-dark hover:underline">
                      {formatDateUa(dispatch.get(r.taskId)!)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                      (r.status === "NEW"
                        ? "bg-brand-orange/15 text-brand-orange"
                        : "bg-neutral-200 text-neutral-600")
                    }
                  >
                    {t(`requests.status.${r.status}` as any)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {isAdmin && (
                    <span className="inline-flex items-center gap-3">
                      {r.status === "NEW" && r.machineId && (
                        <Link
                          href={`/tasks/new?request=${r.id}`}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
                        >
                          {t("requests.createTask")}
                        </Link>
                      )}
                      <RequestRowActions requestId={r.id} status={r.status} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
