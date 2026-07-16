import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  kyivToday,
  formatDateUa,
  dateFieldFromYmd,
  toYmd,
  isOverdue,
} from "@/lib/dates";
import { resolveCities, geoKey, KYIV_BASE } from "@/lib/geocode";
import { ALL_STATUSES } from "@/lib/taskStatus";
import { Link } from "@/i18n/routing";
import StatusBadge from "@/components/ui/StatusBadge";
import type { MapMarker, MapLine } from "@/components/map/UkraineMap";
import MapSection from "@/components/dashboard/MapSection";
import KanbanControls from "@/components/dashboard/KanbanControls";
import MonthGantt, { type GanttRow } from "@/components/dashboard/MonthGantt";
import { STATUS_HEX } from "@/lib/taskStatus";

export const dynamic = "force-dynamic";

const BRIGADE_PALETTE = ["#009C4B", "#F36E33", "#2563EB", "#9333EA", "#0891B2", "#DC2626", "#CA8A04"];

function daysInclusive(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    mfrom?: string;
    mto?: string;
    mbrig?: string;
    kmonth?: string;
    kbrig?: string;
  };
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = (await auth())!;
  const isBrigadier = session.user.role === "BRIGADE_LEADER";
  const isField = isBrigadier || session.user.role === "BRIGADE_MEMBER";
  const today = kyivToday();

  const brigades = await prisma.brigade.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  const brigadeColor = new Map<string, string>(
    brigades.map((b: any, i: number) => [b.id, BRIGADE_PALETTE[i % BRIGADE_PALETTE.length]])
  );

  /* ---------------- Карта ---------------- */
  const periodMode = !!(searchParams.mfrom && searchParams.mto);
  const markers: MapMarker[] = [];
  const polylines: MapLine[] = [];

  if (periodMode) {
    // Режим періоду: всі точки, де була бригада за вибраний строк
    const tasks = await prisma.task.findMany({
      where: {
        executorType: "BRIGADE",
        dateFrom: { lte: dateFieldFromYmd(searchParams.mto!) },
        dateTo: { gte: dateFieldFromYmd(searchParams.mfrom!) },
        ...(searchParams.mbrig
          ? { OR: [{ brigadeId: searchParams.mbrig }, { secondBrigadeId: searchParams.mbrig }] }
          : {}),
      },
      include: { brigade: true, secondBrigade: true, client: true },
      orderBy: { dateFrom: "asc" },
      take: 300,
    });

    const geo = await resolveCities(tasks.map((x: any) => ({ city: x.city, oblast: x.oblast })));

    // черговість точок: нумерація в хронологічному порядку окремо для кожної бригади
    const byBrigade = new Map<string, { name: string; points: [number, number][]; seq: number }>();
    for (const task of tasks as any[]) {
      const pos =
        task.lat != null && task.lng != null
          ? { lat: task.lat, lng: task.lng }
          : geo.get(geoKey(task.city, task.oblast));
      if (!pos) continue;
      const bIds = [task.brigadeId, task.secondBrigadeId].filter(Boolean) as string[];
      for (const bid of bIds) {
        const color = brigadeColor.get(bid) ?? "#6B7280";
        const bName =
          bid === task.brigadeId ? task.brigade?.name : task.secondBrigade?.name;
        if (!byBrigade.has(bid)) byBrigade.set(bid, { name: bName ?? "", points: [], seq: 0 });
        const entry = byBrigade.get(bid)!;
        entry.seq++;
        markers.push({
          lat: pos.lat,
          lng: pos.lng,
          color,
          label: String(entry.seq),
          title: `${entry.seq}. ${task.city}`,
          lines: [
            bName ?? "",
            task.client.name,
            `${formatDateUa(task.dateFrom)} — ${formatDateUa(task.dateTo)}`,
          ],
        });
        entry.points.push([pos.lat, pos.lng]);
      }
    }
    // маршрут-пунктир, коли обрано одну бригаду
    if (searchParams.mbrig) {
      const entry = byBrigade.get(searchParams.mbrig);
      if (entry && entry.points.length > 1) {
        polylines.push({ color: brigadeColor.get(searchParams.mbrig) ?? "#6B7280", points: entry.points });
      }
    }
  } else {
    // Живий режим: маркер кожної бригади (активна задача або база в Києві)
    const activeTasks = await prisma.task.findMany({
      where: {
        executorType: "BRIGADE",
        status: { in: ["EN_ROUTE", "ON_SITE"] },
        dateFrom: { lte: today },
        dateTo: { gte: today },
      },
      include: { brigade: true, secondBrigade: true, client: true },
      orderBy: { dateTo: "asc" },
    });
    const overdueByBrigade = await prisma.task.groupBy({
      by: ["brigadeId"],
      where: {
        executorType: "BRIGADE",
        dateTo: { lt: today },
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
        brigadeId: { not: null },
      },
      _count: { _all: true },
    });
    const overdueSet = new Set(
      (overdueByBrigade as any[]).map((g) => g.brigadeId as string)
    );

    const geo = await resolveCities(
      activeTasks.map((x: any) => ({ city: x.city, oblast: x.oblast }))
    );

    const brigadeActive = new Map<string, any>();
    for (const task of activeTasks as any[]) {
      for (const bid of [task.brigadeId, task.secondBrigadeId].filter(Boolean) as string[]) {
        if (!brigadeActive.has(bid)) brigadeActive.set(bid, task);
      }
    }

    for (const b of brigades as any[]) {
      const task = brigadeActive.get(b.id);
      const hasOverdue = overdueSet.has(b.id);
      if (task) {
        const pos =
          (task.lat != null && task.lng != null
            ? { lat: task.lat, lng: task.lng }
            : geo.get(geoKey(task.city, task.oblast))) ?? KYIV_BASE;
        markers.push({
          lat: pos.lat,
          lng: pos.lng,
          color: hasOverdue ? "#DC2626" : task.status === "ON_SITE" ? "#009C4B" : "#F36E33",
          radius: 11,
          title: b.name,
          lines: [
            `${t(`status.${task.status}` as any)}`,
            task.client.name,
            `${task.city} · ${formatDateUa(task.dateFrom)} — ${formatDateUa(task.dateTo)}`,
          ],
        });
      } else {
        markers.push({
          lat: KYIV_BASE.lat + (Math.random() - 0.5) * 0.02,
          lng: KYIV_BASE.lng + (Math.random() - 0.5) * 0.02,
          color: hasOverdue ? "#DC2626" : "#9CA3AF",
          radius: 10,
          title: b.name,
          lines: [t("dashboard.map.atBase")],
        });
      }
    }
  }

  /* ---------------- Зведення дня ---------------- */
  const brigadeScope = isField ? { assignees: { some: { id: session.user.id } } } : {};
  const [todayTasks, upcoming] = await Promise.all([
    prisma.task.findMany({
      where: {
        dateFrom: { lte: today },
        dateTo: { gte: today },
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
        ...brigadeScope,
      },
      include: {
        brigade: true,
        secondBrigade: true,
        client: true,
        assignees: { select: { id: true, name: true } },
      },
      orderBy: { dateTo: "asc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: {
        dateFrom: { gt: today },
        status: { notIn: ["DONE", "PARTIALLY_DONE", "NOT_DONE"] },
        ...brigadeScope,
      },
      include: {
        brigade: true,
        secondBrigade: true,
        client: true,
        assignees: { select: { id: true, name: true } },
      },
      orderBy: { dateFrom: "asc" },
      take: 10,
    }),
  ]);

  const assigneeNames = (task: any) =>
    task.assignees?.length > 0
      ? task.assignees.map((a: any) => a.name).join(", ")
      : `${task.brigade?.name ?? "—"}${task.secondBrigade ? ` + ${task.secondBrigade.name}` : ""}`;

  const executorNamePlain = (task: any) =>
    task.executorType === "OUTSOURCE" ? task.outsourceName ?? "—" : assigneeNames(task);

  const executorName = (task: any) =>
    task.executorType === "OUTSOURCE"
      ? `${t("tasks.executor.OUTSOURCE")}: ${task.outsourceName ?? "—"}`
      : assigneeNames(task);

  const summaryCard = (
    title: string,
    tasks: any[],
    accent: "red" | "green" | "neutral"
  ) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3
        className={
          "mb-2 text-sm font-semibold " +
          (accent === "red"
            ? "text-red-600"
            : accent === "green"
              ? "text-brand-dark"
              : "text-neutral-700")
        }
      >
        {title} <span className="text-neutral-400">({tasks.length})</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-neutral-400">{t("dashboard.noTasks")}</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {tasks.map((task: any) => (
            <li key={task.id} className={accent === "red" ? "rounded bg-red-50 px-2 py-1" : ""}>
              <Link href={`/tasks/${task.id}`} className="font-medium text-brand-dark hover:underline">
                {formatDateUa(task.dateFrom)}–{formatDateUa(task.dateTo)}
              </Link>{" "}
              · {executorName(task)} · {task.client.name}, {task.city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  /* ---------------- Канбан ---------------- */
  const kmonth = searchParams.kmonth ?? toYmd(today).slice(0, 7);
  const [ky, km] = kmonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(ky, km - 1, 1));
  const monthEnd = new Date(Date.UTC(ky, km, 0));
  const kanbanTasks = await prisma.task.findMany({
    where: {
      dateFrom: { lte: monthEnd },
      dateTo: { gte: monthStart },
      ...(searchParams.kbrig
        ? { OR: [{ brigadeId: searchParams.kbrig }, { secondBrigadeId: searchParams.kbrig }] }
        : isField
          ? brigadeScope
          : {}),
    },
    include: {
      brigade: true,
      secondBrigade: true,
      client: true,
      assignees: { select: { id: true, name: true, role: true } },
    },
    orderBy: { dateFrom: "asc" },
    take: 200,
  });
  const byStatus = new Map<string, any[]>(ALL_STATUSES.map((s) => [s, []]));
  for (const task of kanbanTasks as any[]) byStatus.get(task.status)?.push(task);

  // Календар місяця з полосками задач
  const daysInMonth = monthEnd.getUTCDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const wd = new Date(Date.UTC(ky, km - 1, i + 1)).getUTCDay();
    return { n: i + 1, weekend: wd === 0 || wd === 6 };
  });
  const todayIdx =
    today >= monthStart && today <= monthEnd ? today.getUTCDate() - 1 : -1;
  const clampIdx = (d: Date) =>
    Math.min(Math.max(Math.round((d.getTime() - monthStart.getTime()) / 86400000), 0), daysInMonth - 1);

  // рядок календаря = виконавець (людина або аутсорсер)
  const execMap = new Map<string, { name: string; sort: number; tasks: any[] }>();
  for (const task of kanbanTasks as any[]) {
    if (task.executorType === "OUTSOURCE") {
      const key = `o:${task.outsourceName ?? "?"}`;
      if (!execMap.has(key))
        execMap.set(key, { name: `${task.outsourceName ?? "?"} (${t("tasks.executor.OUTSOURCE")})`, sort: 1, tasks: [] });
      execMap.get(key)!.tasks.push(task);
    } else {
      for (const a of task.assignees) {
        const key = `u:${a.id}`;
        if (!execMap.has(key)) execMap.set(key, { name: a.name, sort: 0, tasks: [] });
        execMap.get(key)!.tasks.push(task);
      }
    }
  }
  // Примусова черговість: спершу перелічені імена в заданому порядку,
  // потім інші виконавці за алфавітом, аутсорсери — завжди в кінці.
  const EXEC_PRIORITY = ["Кирилко", "Захарчук", "Фляга", "Коробка", "Комаров"];
  const priorityIndex = (name: string) => {
    const i = EXEC_PRIORITY.indexOf(name);
    return i === -1 ? EXEC_PRIORITY.length : i;
  };
  const ganttRows: GanttRow[] = [...execMap.entries()]
    .sort(
      (a, b) =>
        a[1].sort - b[1].sort ||
        priorityIndex(a[1].name) - priorityIndex(b[1].name) ||
        a[1].name.localeCompare(b[1].name)
    )
    .map(([key, e]) => {
      const bars = e.tasks
        .map((task) => ({
          id: task.id,
          startIdx: clampIdx(task.dateFrom),
          endIdx: clampIdx(task.dateTo),
          color: STATUS_HEX[task.status as keyof typeof STATUS_HEX] ?? "#9CA3AF",
          title: `${task.client.name}, ${task.city} · ${formatDateUa(task.dateFrom)}–${formatDateUa(task.dateTo)}`,
          lane: 0,
        }))
        .sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx);
      // роздача "доріжок", щоб полоси не накладались
      const laneEnds: number[] = [];
      for (const bar of bars) {
        let lane = laneEnds.findIndex((end) => end < bar.startIdx);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(bar.endIdx);
        } else {
          laneEnds[lane] = bar.endIdx;
        }
        bar.lane = lane;
      }
      return { key, name: e.name, bars, lanes: Math.max(1, laneEnds.length) };
    });

  /* ---------------- Аналітика (MTTR, тривалість) ---------------- */
  const yearAgo = new Date(today);
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const [doneTasks, closedRequests] = await Promise.all([
    prisma.task.findMany({
      where: { status: "DONE", dateTo: { gte: yearAgo } },
      include: { machines: { include: { type: true } } },
    }),
    prisma.serviceRequest.findMany({
      where: { status: "CLOSED", taskId: { not: null }, createdAt: { gte: yearAgo } },
      select: { createdAt: true, taskId: true },
    }),
  ]);

  // реакція на заявку: від отримання до дати виїзду бригади
  const reqTaskIds = (closedRequests as any[]).map((r) => r.taskId) as string[];
  const reqTasks = reqTaskIds.length
    ? await prisma.task.findMany({
        where: { id: { in: reqTaskIds } },
        select: { id: true, dateFrom: true },
      })
    : [];
  const dispatchMap = new Map<string, Date>(reqTasks.map((x: any) => [x.id, x.dateFrom]));
  const reactionDays = (closedRequests as any[])
    .filter((r) => dispatchMap.has(r.taskId))
    .map((r) =>
      Math.max(0, (dispatchMap.get(r.taskId)!.getTime() - new Date(r.createdAt).getTime()) / 86400000)
    )
    .map((x) => Math.round(x * 10) / 10);

  const durations = (list: any[]) => list.map((x) => daysInclusive(x.dateFrom, x.dateTo));
  const avg = (nums: number[]) =>
    nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;

  const mttr = avg(durations((doneTasks as any[]).filter((x) => x.taskType === "REPAIR")));
  const avgAll = avg(durations(doneTasks as any[]));

  // ПНР за групами обладнання (токарні, фрезерні тощо)
  const pnrByType = new Map<string, number[]>();
  for (const task of (doneTasks as any[]).filter((x) => x.taskType === "PNR")) {
    const d = daysInclusive(task.dateFrom, task.dateTo);
    for (const m of task.machines) {
      const name = locale === "ru" ? m.type.nameRu : m.type.nameUk;
      if (!pnrByType.has(name)) pnrByType.set(name, []);
      pnrByType.get(name)!.push(d);
    }
  }
  const pnrRows = [...pnrByType.entries()]
    .map(([name, ds]) => ({ name, avg: avg(ds)!, count: ds.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const typeRows = ["ENGINEERING", "PNR", "REPAIR", "DEFECTATION", "VISIT", "OTHER"]
    .map((tt) => {
      const ds = durations((doneTasks as any[]).filter((x) => x.taskType === tt));
      return { type: tt, avg: avg(ds), count: ds.length };
    })
    .filter((r) => r.count > 0);

  /* ---------------- Рендер ---------------- */
  return (
    <div className="space-y-4">
      {/* Календар місяця: виконавці × дні — завжди видимий */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">{t("dashboard.sections.calendar")}</h2>
          <Link
            href="/tasks/new"
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            + {t("dashboard.newTask")}
          </Link>
        </div>
        <KanbanControls
          brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
          defaultMonth={kmonth}
        />
        <MonthGantt
          days={calendarDays}
          todayIdx={todayIdx}
          rows={ganttRows}
          emptyText={t("dashboard.noTasks")}
        />
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
          {ALL_STATUSES.map((st) => (
            <span key={st}>
              <span
                className="mr-1 inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: STATUS_HEX[st] }}
              ></span>
              {t(`status.${st}` as any)}
            </span>
          ))}
        </div>
      </section>

      {/* Зведення дня */}
      <section className="grid gap-4 lg:grid-cols-2">
        {summaryCard(t("dashboard.todayTasks"), todayTasks, "green")}
        {summaryCard(t("dashboard.upcoming"), upcoming, "neutral")}
      </section>

      {/* Карта — розгортається */}
      <MapSection
        markers={markers}
        polylines={polylines}
        brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
        periodMode={periodMode}
        defaultOpen={periodMode}
      />

      {/* Канбан — розгортається */}
      <details className="rounded-xl border border-neutral-200 bg-white" open={!!searchParams.kbrig || !!searchParams.kmonth}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="text-base font-bold">{t("dashboard.kanban.title")}</span>
          <span className="text-neutral-400">▾</span>
        </summary>
        <div className="border-t border-neutral-100 p-4">
        <KanbanControls
          brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
          defaultMonth={kmonth}
        />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ALL_STATUSES.map((status) => {
            const list = byStatus.get(status) ?? [];
            return (
              <div key={status} className="w-60 shrink-0 rounded-xl bg-neutral-100 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <StatusBadge status={status} />
                  <span className="text-xs font-bold text-neutral-400">{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((task: any) => {
                    const overdue = isOverdue(task.dateTo, task.status);
                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className={
                          "block rounded-lg border bg-white p-2.5 text-xs shadow-sm transition hover:shadow " +
                          (overdue ? "border-red-300" : "border-neutral-200")
                        }
                      >
                        <p className="font-semibold text-neutral-800">{task.client.name}</p>
                        <p className="text-neutral-500">{task.city}</p>
                        <p className={"mt-1 " + (overdue ? "font-semibold text-red-600" : "text-neutral-400")}>
                          {formatDateUa(task.dateFrom)}–{formatDateUa(task.dateTo)}
                        </p>
                        <p className="mt-0.5 text-neutral-500">{executorName(task)}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </details>

      {/* Аналітика — розгортається */}
      <details className="rounded-xl border border-neutral-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="text-base font-bold">{t("dashboard.analytics.title")}</span>
          <span className="text-neutral-400">▾</span>
        </summary>
        <div className="border-t border-neutral-100 p-4">
        <p className="mb-3 text-xs text-neutral-400">{t("dashboard.analytics.hint")}</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-400">MTTR</p>
            <p className="mt-1 text-3xl font-bold text-brand-dark">
              {mttr !== null ? mttr : "—"}
              {mttr !== null && <span className="ml-1 text-sm font-medium text-neutral-400">{t("dashboard.analytics.days")}</span>}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{t("dashboard.analytics.mttrHint")}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-400">{t("dashboard.analytics.avgAll")}</p>
            <p className="mt-1 text-3xl font-bold text-brand-dark">
              {avgAll !== null ? avgAll : "—"}
              {avgAll !== null && <span className="ml-1 text-sm font-medium text-neutral-400">{t("dashboard.analytics.days")}</span>}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{t("dashboard.analytics.avgAllHint", { count: doneTasks.length })}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-400">{t("dashboard.analytics.reaction")}</p>
            <p className="mt-1 text-3xl font-bold text-brand-dark">
              {reactionDays.length ? avg(reactionDays) : "—"}
              {reactionDays.length > 0 && (
                <span className="ml-1 text-sm font-medium text-neutral-400">{t("dashboard.analytics.days")}</span>
              )}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {t("dashboard.analytics.reactionHint", { count: reactionDays.length })}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 md:col-span-2 lg:col-span-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">{t("dashboard.analytics.pnrByGroup")}</p>
            {pnrRows.length === 0 ? (
              <p className="text-sm text-neutral-400">{t("dashboard.noTasks")}</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {pnrRows.map((r) => (
                    <tr key={r.name} className="border-b border-neutral-50 last:border-0">
                      <td className="py-1 pr-2">{r.name}</td>
                      <td className="py-1 text-right font-semibold text-brand-dark">
                        {r.avg} {t("dashboard.analytics.days")}
                      </td>
                      <td className="w-16 py-1 text-right text-xs text-neutral-400">n={r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {typeRows.length > 0 && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">{t("dashboard.analytics.byTaskType")}</p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {typeRows.map((r) => (
                <div key={r.type}>
                  <span className="text-neutral-500">{t(`taskType.${r.type}` as any)}:</span>{" "}
                  <span className="font-semibold text-brand-dark">
                    {r.avg} {t("dashboard.analytics.days")}
                  </span>{" "}
                  <span className="text-xs text-neutral-400">n={r.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </details>
    </div>
  );
}
