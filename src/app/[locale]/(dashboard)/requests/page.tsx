import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa } from "@/lib/dates";
import { Link } from "@/i18n/routing";
import RequestRowActions from "@/components/requests/RequestRowActions";

export const dynamic = "force-dynamic";

/** Заявки на виїзд — таблиця. Доступ: керівник відділу та директор. */
export default async function RequestsPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (!["ADMIN", "VIEWER"].includes(session.user.role)) redirect(`/${params.locale}`);
  const isAdmin = session.user.role === "ADMIN";

  const requests = await prisma.serviceRequest.findMany({
    include: { machine: { include: { type: true } }, client: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
  });

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
      <h1 className="mb-1 text-xl font-bold">{t("requests.title")}</h1>
      <p className="mb-4 text-sm text-neutral-500">{t("requests.hint")}</p>

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
    </div>
  );
}
