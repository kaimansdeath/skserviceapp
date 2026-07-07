import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateUa, isOverdue } from "@/lib/dates";
import { Link } from "@/i18n/routing";
import StatusBadge from "@/components/ui/StatusBadge";
import StatusChanger from "@/components/tasks/StatusChanger";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      brigade: true,
      client: true,
      machine: { include: { type: true } },
      createdBy: true,
      statusLogs: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!task) notFound();

  // Бригадир бачить лише задачі своєї бригади
  if (session.user.role === "BRIGADE_LEADER" && session.user.brigadeId !== task.brigadeId) {
    notFound();
  }

  const overdue = isOverdue(task.dateTo, task.status);
  const canChangeStatus =
    session.user.role === "ADMIN" ||
    (session.user.role === "BRIGADE_LEADER" && session.user.brigadeId === task.brigadeId);

  const rows: Array<[string, React.ReactNode]> = [
    [t("tasks.fields.brigade"), task.brigade.name],
    [
      t("tasks.fields.client"),
      <Link key="c" href={`/clients/${task.clientId}`} className="text-brand-dark hover:underline">
        {task.client.name}
      </Link>,
    ],
    [
      t("tasks.fields.machine"),
      task.machine ? (
        <Link key="m" href={`/machines/${task.machine.id}`} className="text-brand-dark hover:underline">
          {task.machine.model}
          {task.machine.serialNumber ? ` (${task.machine.serialNumber})` : ""}
        </Link>
      ) : (
        "—"
      ),
    ],
    [t("tasks.fields.city"), `${task.city}, ${task.oblast}`],
    [t("tasks.fields.invoice"), task.invoiceNumber ?? "—"],
    [
      t("tasks.fields.dates"),
      <span key="d" className={overdue ? "font-semibold text-red-600" : ""}>
        {formatDateUa(task.dateFrom)} — {formatDateUa(task.dateTo)}
        {overdue ? ` · ${t("tasks.overdueBadge")}` : ""}
      </span>,
    ],
    [t("tasks.fields.note"), task.note ?? "—"],
    [t("tasks.fields.createdBy"), task.createdBy.name],
  ];
  if (task.status === "NOT_DONE" && task.failureReason) {
    rows.push([t("tasks.fields.failureReason"), task.failureReason]);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{t("tasks.title")}</h1>
          <StatusBadge status={task.status} />
        </div>
        {session.user.role === "ADMIN" && (
          <Link
            href={`/tasks/${task.id}/edit`}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
          >
            {t("common.edit")}
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white">
        <dl className="divide-y divide-neutral-100">
          {rows.map(([label, value], i) => (
            <div key={i} className="grid grid-cols-3 gap-4 px-4 py-2.5 text-sm">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {canChangeStatus && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <StatusChanger taskId={task.id} current={task.status as any} role={session.user.role} />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("tasks.statusLog")}</h2>
        <div className="rounded-xl border border-neutral-200 bg-white">
          <ul className="divide-y divide-neutral-100 text-sm">
            {task.statusLogs.map((log: any) => (
              <li key={log.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                <span className="text-xs text-neutral-400">
                  {new Date(log.createdAt).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}
                </span>
                <StatusBadge status={log.toStatus} />
                <span className="text-neutral-500">
                  {log.user?.name ?? "—"} · {log.source}
                </span>
                {log.comment && <span className="text-neutral-600">«{log.comment}»</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
