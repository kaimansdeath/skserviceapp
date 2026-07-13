import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa, isOverdue, isToday, dateFieldFromYmd } from "@/lib/dates";
import { Link } from "@/i18n/routing";
import StatusBadge from "@/components/ui/StatusBadge";
import StatusQuickChange from "@/components/tasks/StatusQuickChange";
import TaskFilters from "@/components/tasks/TaskFilters";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: {
    brigade?: string;
    status?: string;
    from?: string;
    to?: string;
    city?: string;
    manager?: string;
  };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role === "STOREKEEPER") redirect("/tools");
  const isBrigadier = session.user.role === "BRIGADE_LEADER";
  const isMember = session.user.role === "BRIGADE_MEMBER";
  const isField = isBrigadier || isMember;
  const brigadeFilter = isField ? null : searchParams.brigade || undefined;

  const [brigades, managers, tasks] = await Promise.all([
    prisma.brigade.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.manager.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      where: {
        // «Виконано» одразу переходить в Архів;
        // Не виконано / Виконано не повністю залишаються в пулі задач
        NOT: { status: "DONE" },
        ...(isField
          ? {
              assignees: { some: { id: session.user.id } },
              ...(isMember ? { status: { not: "ASSIGNED" } } : {}),
            }
          : brigadeFilter
            ? { OR: [{ brigadeId: brigadeFilter }, { secondBrigadeId: brigadeFilter }] }
            : {}),
        ...(searchParams.status ? { status: searchParams.status as any } : {}),
        ...(searchParams.city
          ? { city: { contains: searchParams.city, mode: "insensitive" } }
          : {}),
        ...(searchParams.manager ? { client: { managerId: searchParams.manager } } : {}),
        ...(searchParams.from ? { dateTo: { gte: dateFieldFromYmd(searchParams.from) } } : {}),
        ...(searchParams.to ? { dateFrom: { lte: dateFieldFromYmd(searchParams.to) } } : {}),
      },
      include: {
        brigade: true,
        secondBrigade: true,
        client: true,
        machines: true,
        invoice: true,
        assignees: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ dateFrom: "desc" }],
      take: 200,
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("tasks.title")}</h1>
        {session.user.role === "ADMIN" && (
          <Link
            href="/tasks/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            + {t("tasks.new")}
          </Link>
        )}
      </div>

      <TaskFilters
        brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
        managers={managers.map((m: any) => ({ id: m.id, name: m.name }))}
        lockBrigade={isField ? session.user.brigadeId ?? "self" : null}
      />

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("tasks.fields.dates")}</th>
              <th className="px-3 py-2">{t("tasks.fields.taskType")}</th>
              <th className="px-3 py-2">{t("tasks.fields.executor")}</th>
              <th className="px-3 py-2">{t("tasks.fields.client")}</th>
              <th className="px-3 py-2">{t("tasks.fields.city")}</th>
              <th className="px-3 py-2">{t("tasks.fields.machine")}</th>
              <th className="px-3 py-2">{t("tasks.fields.invoice")}</th>
              <th className="px-3 py-2">{t("tasks.fields.status")}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                  {t("tasks.empty")}
                </td>
              </tr>
            )}
            {tasks.map((task: any) => {
              const overdue = isOverdue(task.dateTo, task.status);
              const todayTask = isToday(task.dateFrom, task.dateTo) && !overdue;
              return (
                <tr
                  key={task.id}
                  className={
                    "border-b border-neutral-100 last:border-0 " +
                    (overdue ? "bg-red-50" : todayTask ? "bg-brand/5" : "")
                  }
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link
                      href={`/tasks/${task.id}`}
                      className={
                        "text-brand-dark hover:underline " +
                        (todayTask ? "font-extrabold" : "font-medium")
                      }
                    >
                      {formatDateUa(task.dateFrom)} — {formatDateUa(task.dateTo)}
                    </Link>
                    {overdue && (
                      <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        {t("tasks.overdueBadge")}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                    {t(`taskType.${task.taskType}` as any)}
                  </td>
                  <td className="px-3 py-2">
                    {task.executorType === "OUTSOURCE" ? (
                      <span className="text-brand-orange">
                        {t("tasks.executor.OUTSOURCE")}: {task.outsourceName ?? "—"}
                      </span>
                    ) : (
                      <>
                        {task.assignees.length > 0
                          ? task.assignees.map((a: any) => a.name).join(", ")
                          : `${task.brigade?.name ?? "—"}${task.secondBrigade ? ` + ${task.secondBrigade.name}` : ""}`}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">{task.client.name}</td>
                  <td className="whitespace-nowrap px-3 py-2">{task.city}</td>
                  <td className="px-3 py-2 text-neutral-500">
                    {task.machines.length > 0
                      ? task.machines.map((m: any) => m.model).join(", ")
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{task.invoice?.number ?? "—"}</td>
                  <td className="px-3 py-2">
                    {session.user.role === "ADMIN" ||
                    (isBrigadier &&
                      task.assignees.some((a: any) => a.id === session.user.id)) ? (
                      <StatusQuickChange
                        taskId={task.id}
                        current={task.status}
                        role={session.user.role}
                      />
                    ) : (
                      <StatusBadge status={task.status} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
