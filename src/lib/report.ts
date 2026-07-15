import { prisma } from "@/lib/prisma";

/**
 * Місячний звіт: єдиний builder для веб-сторінки та Excel-експорту.
 * Місяць задається як "YYYY-MM" (київський календар, межі по датах задач).
 */

export type ExecutorRow = {
  name: string;
  isOutsource: boolean;
  tasksTotal: number;
  daysInMonth: number; // сумарні дні відряджень у межах місяця
  done: number;
  notDone: number; // NOT_DONE + прострочені активні на кінець місяця
};

export type BrigadeRow = {
  name: string;
  tasksTotal: number;
  done: number;
  onTime: number; // DONE, де фактичне закриття <= планової dateTo
  onTimePct: number | null;
};

export type TypeRow = {
  taskType: string;
  count: number;
  avgDurationDays: number;
};

export type MonthReport = {
  month: string;
  monthStart: Date;
  monthEnd: Date;
  executors: ExecutorRow[];
  brigades: BrigadeRow[];
  types: TypeRow[];
  requests: {
    received: number;
    closed: number;
    avgReactionDays: number | null;
  };
  topClients: { name: string; count: number }[];
  totals: { tasks: number; done: number; notDone: number };
};

function monthBounds(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // останній день місяця
  return { start, end };
}

function overlapDays(from: Date, to: Date, start: Date, end: Date): number {
  const a = Math.max(from.getTime(), start.getTime());
  const b = Math.min(to.getTime(), end.getTime());
  if (b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

export async function buildMonthReport(month: string): Promise<MonthReport> {
  const { start, end } = monthBounds(month);

  const [tasks, requests] = await Promise.all([
    prisma.task.findMany({
      where: { dateFrom: { lte: end }, dateTo: { gte: start } },
      include: {
        client: true,
        brigade: true,
        secondBrigade: true,
        assignees: { select: { id: true, name: true } },
        statusLogs: {
          where: { toStatus: "DONE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.serviceRequest.findMany({
      where: { createdAt: { gte: start, lte: new Date(end.getTime() + 86399999) } },
    }),
  ]);

  // --- виконавці ---
  const execMap = new Map<string, ExecutorRow>();
  for (const task of tasks as any[]) {
    const days = overlapDays(task.dateFrom, task.dateTo, start, end);
    const isDone = task.status === "DONE";
    const isNotDone =
      task.status === "NOT_DONE" ||
      (task.dateTo < end && !["DONE", "PARTIALLY_DONE", "NOT_DONE"].includes(task.status));

    const addTo = (key: string, name: string, isOutsource: boolean) => {
      if (!execMap.has(key)) {
        execMap.set(key, { name, isOutsource, tasksTotal: 0, daysInMonth: 0, done: 0, notDone: 0 });
      }
      const row = execMap.get(key)!;
      row.tasksTotal++;
      row.daysInMonth += days;
      if (isDone) row.done++;
      if (isNotDone) row.notDone++;
    };

    if (task.executorType === "OUTSOURCE") {
      addTo(`o:${task.outsourceName ?? "?"}`, task.outsourceName ?? "?", true);
    } else {
      for (const a of task.assignees) addTo(`u:${a.id}`, a.name, false);
    }
  }
  const executors = [...execMap.values()].sort(
    (a, b) => Number(a.isOutsource) - Number(b.isOutsource) || b.daysInMonth - a.daysInMonth
  );

  // --- бригади (% вчасно) ---
  const brigMap = new Map<string, BrigadeRow>();
  for (const task of tasks as any[]) {
    if (task.executorType === "OUTSOURCE") continue;
    const names: string[] = [];
    if (task.brigade) names.push(task.brigade.name);
    if (task.secondBrigade) names.push(task.secondBrigade.name);
    if (names.length === 0) names.push("—");
    const isDone = task.status === "DONE";
    const doneLog = task.statusLogs[0];
    const endOfDue = new Date(task.dateTo.getTime() + 86399999);
    const onTime = isDone && doneLog ? doneLog.createdAt <= endOfDue : false;
    for (const n of names) {
      if (!brigMap.has(n)) brigMap.set(n, { name: n, tasksTotal: 0, done: 0, onTime: 0, onTimePct: null });
      const row = brigMap.get(n)!;
      row.tasksTotal++;
      if (isDone) {
        row.done++;
        if (onTime) row.onTime++;
      }
    }
  }
  for (const row of brigMap.values()) {
    row.onTimePct = row.done > 0 ? Math.round((row.onTime / row.done) * 100) : null;
  }
  const brigades = [...brigMap.values()].sort((a, b) => b.tasksTotal - a.tasksTotal);

  // --- типи задач ---
  const typeMap = new Map<string, { count: number; days: number }>();
  for (const task of tasks as any[]) {
    const dur = Math.round((task.dateTo.getTime() - task.dateFrom.getTime()) / 86400000) + 1;
    if (!typeMap.has(task.taskType)) typeMap.set(task.taskType, { count: 0, days: 0 });
    const x = typeMap.get(task.taskType)!;
    x.count++;
    x.days += dur;
  }
  const types: TypeRow[] = [...typeMap.entries()]
    .map(([taskType, x]) => ({
      taskType,
      count: x.count,
      avgDurationDays: Math.round((x.days / x.count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // --- заявки ---
  const closed = (requests as any[]).filter((r) => r.status === "CLOSED");
  const withTask = closed.filter((r) => r.taskId);
  let avgReactionDays: number | null = null;
  if (withTask.length > 0) {
    const taskIds = withTask.map((r) => r.taskId) as string[];
    const linked = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, dateFrom: true },
    });
    const map = new Map(linked.map((x: any) => [x.id, x.dateFrom]));
    const vals = withTask
      .filter((r) => map.has(r.taskId))
      .map((r) =>
        Math.max(0, ((map.get(r.taskId) as Date).getTime() - new Date(r.createdAt).getTime()) / 86400000)
      );
    if (vals.length > 0) {
      avgReactionDays = Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
    }
  }

  // --- топ клієнтів ---
  const clientMap = new Map<string, number>();
  for (const task of tasks as any[]) {
    clientMap.set(task.client.name, (clientMap.get(task.client.name) ?? 0) + 1);
  }
  const topClients = [...clientMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const doneCount = (tasks as any[]).filter((x) => x.status === "DONE").length;
  const notDoneCount = (tasks as any[]).filter((x) => x.status === "NOT_DONE").length;

  return {
    month,
    monthStart: start,
    monthEnd: end,
    executors,
    brigades,
    types,
    requests: {
      received: requests.length,
      closed: closed.length,
      avgReactionDays,
    },
    topClients,
    totals: { tasks: tasks.length, done: doneCount, notDone: notDoneCount },
  };
}
