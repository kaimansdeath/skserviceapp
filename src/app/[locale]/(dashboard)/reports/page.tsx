import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildMonthReport } from "@/lib/report";
import { kyivToday } from "@/lib/dates";
import ReportControls from "@/components/reports/ReportControls";

export const dynamic = "force-dynamic";

/** Звіти: місячна зведена статистика з експортом в Excel */
export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { month?: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (!["ADMIN", "VIEWER", "ACCOUNTANT"].includes(session.user.role)) {
    redirect(`/${params.locale}`);
  }

  const today = kyivToday();
  const defaultMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : defaultMonth;

  const report = await buildMonthReport(month);

  const card = "rounded-xl border border-neutral-200 bg-white";
  const th = "px-3 py-2 text-left text-xs uppercase tracking-wide text-neutral-500";
  const td = "px-3 py-2";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("reports.title")}</h1>
      <ReportControls month={month} />

      {/* Підсумок */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className={card + " p-4"}>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("reports.totalTasks")}</p>
          <p className="mt-1 text-3xl font-bold text-neutral-800">{report.totals.tasks}</p>
        </div>
        <div className={card + " p-4"}>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("reports.doneTasks")}</p>
          <p className="mt-1 text-3xl font-bold text-brand-dark">{report.totals.done}</p>
        </div>
        <div className={card + " p-4"}>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("reports.requestsCard")}</p>
          <p className="mt-1 text-3xl font-bold text-neutral-800">
            {report.requests.received}
            <span className="ml-2 text-sm font-medium text-neutral-400">
              {t("reports.requestsClosed", { count: report.requests.closed })}
              {report.requests.avgReactionDays != null &&
                ` · ${t("reports.reaction", { days: report.requests.avgReactionDays })}`}
            </span>
          </p>
        </div>
      </section>

      {/* Виконавці */}
      <section className={card}>
        <h2 className="border-b border-neutral-100 px-4 py-3 text-base font-bold">
          {t("reports.byExecutors")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className={th}>{t("reports.cols.executor")}</th>
                <th className={th + " text-center"}>{t("reports.cols.tasks")}</th>
                <th className={th + " text-center"}>{t("reports.cols.days")}</th>
                <th className={th + " text-center"}>{t("reports.cols.done")}</th>
                <th className={th + " text-center"}>{t("reports.cols.notDone")}</th>
              </tr>
            </thead>
            <tbody>
              {report.executors.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-400">—</td></tr>
              )}
              {report.executors.map((e) => (
                <tr key={e.name + e.isOutsource} className="border-b border-neutral-100 last:border-0">
                  <td className={td + " font-medium"}>
                    {e.name}
                    {e.isOutsource && (
                      <span className="ml-1.5 text-xs text-neutral-400">
                        ({t("tasks.executor.OUTSOURCE")})
                      </span>
                    )}
                  </td>
                  <td className={td + " text-center"}>{e.tasksTotal}</td>
                  <td className={td + " text-center font-semibold"}>{e.daysInMonth}</td>
                  <td className={td + " text-center text-brand-dark"}>{e.done}</td>
                  <td className={td + " text-center " + (e.notDone > 0 ? "font-semibold text-red-600" : "")}>
                    {e.notDone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Бригади */}
      <section className={card}>
        <h2 className="border-b border-neutral-100 px-4 py-3 text-base font-bold">
          {t("reports.byBrigades")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className={th}>{t("reports.cols.brigade")}</th>
                <th className={th + " text-center"}>{t("reports.cols.tasks")}</th>
                <th className={th + " text-center"}>{t("reports.cols.done")}</th>
                <th className={th + " text-center"}>{t("reports.cols.onTime")}</th>
              </tr>
            </thead>
            <tbody>
              {report.brigades.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-neutral-400">—</td></tr>
              )}
              {report.brigades.map((b) => (
                <tr key={b.name} className="border-b border-neutral-100 last:border-0">
                  <td className={td + " font-medium"}>{b.name}</td>
                  <td className={td + " text-center"}>{b.tasksTotal}</td>
                  <td className={td + " text-center"}>{b.done}</td>
                  <td className={td + " text-center"}>
                    {b.onTimePct != null ? (
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs font-semibold " +
                          (b.onTimePct >= 80
                            ? "bg-brand/10 text-brand-dark"
                            : b.onTimePct >= 50
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-700")
                        }
                      >
                        {b.onTimePct}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Типи задач */}
        <section className={card}>
          <h2 className="border-b border-neutral-100 px-4 py-3 text-base font-bold">
            {t("reports.byTypes")}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className={th}>{t("reports.cols.type")}</th>
                <th className={th + " text-center"}>{t("reports.cols.count")}</th>
                <th className={th + " text-center"}>{t("reports.cols.avgDuration")}</th>
              </tr>
            </thead>
            <tbody>
              {report.types.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-400">—</td></tr>
              )}
              {report.types.map((x) => (
                <tr key={x.taskType} className="border-b border-neutral-100 last:border-0">
                  <td className={td}>{t(`taskType.${x.taskType}` as any)}</td>
                  <td className={td + " text-center"}>{x.count}</td>
                  <td className={td + " text-center"}>{x.avgDurationDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Топ клієнтів */}
        <section className={card}>
          <h2 className="border-b border-neutral-100 px-4 py-3 text-base font-bold">
            {t("reports.topClients")}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className={th}>{t("reports.cols.client")}</th>
                <th className={th + " text-center"}>{t("reports.cols.visits")}</th>
              </tr>
            </thead>
            <tbody>
              {report.topClients.length === 0 && (
                <tr><td colSpan={2} className="px-3 py-6 text-center text-neutral-400">—</td></tr>
              )}
              {report.topClients.map((c) => (
                <tr key={c.name} className="border-b border-neutral-100 last:border-0">
                  <td className={td}>{c.name}</td>
                  <td className={td + " text-center font-semibold"}>{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
