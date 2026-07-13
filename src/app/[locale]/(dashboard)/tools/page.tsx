import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import ToolRow, { type ToolItem } from "@/components/tools/ToolRow";
import AddToolForm from "@/components/tools/AddToolForm";
import ToolRequestActions from "@/components/tools/ToolRequestActions";

export const dynamic = "force-dynamic";

const TABS = ["brigades", "people", "warehouse", "tooling", "purchase"] as const;
type Tab = (typeof TABS)[number];

/** Інструмент: облік, склад, видача, заявки на закупку */
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  const role = session.user.role;
  const canManage = ["ADMIN", "STOREKEEPER"].includes(role);
  const canDelete = role === "ADMIN";
  const isField = ["BRIGADE_LEADER", "BRIGADE_MEMBER"].includes(role);

  const tab: Tab = (TABS as readonly string[]).includes(searchParams.tab ?? "")
    ? (searchParams.tab as Tab)
    : "brigades";

  const [tools, brigades, people, issueRequests, purchaseRequests] = await Promise.all([
    prisma.tool.findMany({
      include: { holderBrigade: true, holderUser: true },
      orderBy: { name: "asc" },
    }),
    prisma.brigade.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: { in: ["BRIGADE_LEADER", "BRIGADE_MEMBER"] }, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.toolRequest.findMany({
      where: { kind: "ISSUE" },
      include: { requestedBy: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.toolRequest.findMany({
      where: { kind: "PURCHASE" },
      include: { requestedBy: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  // польовий персонал бачить лише свою бригаду / себе
  const visibleTools = (tools as any[]).filter((x) => {
    if (!isField) return true;
    return (
      x.holderBrigadeId === session.user.brigadeId || x.holderUserId === session.user.id
    );
  });

  const toItem = (x: any): ToolItem => ({
    id: x.id,
    name: x.name,
    inventoryNumber: x.inventoryNumber,
    toolClass: x.toolClass,
    status: x.status,
    holderLabel: x.holderBrigade?.name ?? x.holderUser?.name ?? t("tools.warehouse"),
    holderKey: x.holderBrigadeId
      ? `b:${x.holderBrigadeId}`
      : x.holderUserId
        ? `p:${x.holderUserId}`
        : "w",
  });

  let filtered = visibleTools;
  if (tab === "people") filtered = visibleTools.filter((x) => x.holderUserId);
  if (tab === "warehouse") filtered = visibleTools.filter((x) => !x.holderBrigadeId && !x.holderUserId);
  if (tab === "tooling")
    filtered = visibleTools.filter((x) => ["TOOLING", "MODULES"].includes(x.toolClass));
  if (tab === "brigades") filtered = visibleTools.filter((x) => x.holderBrigadeId);

  const fmt = (d: Date) =>
    new Date(d).toLocaleString("uk-UA", {
      timeZone: "Europe/Kyiv",
      dateStyle: "short",
      timeStyle: "short",
    });

  const table = (list: any[]) => (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-3 py-2">{t("tools.fields.name")}</th>
            <th className="px-3 py-2">{t("tools.fields.inv")}</th>
            <th className="px-3 py-2">{t("tools.fields.class")}</th>
            <th className="px-3 py-2">{t("tools.fields.status")}</th>
            <th className="px-3 py-2">{t("tools.fields.holder")}</th>
            <th className="w-10 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-neutral-400">
                {t("tools.empty")}
              </td>
            </tr>
          )}
          {list.map((x) => (
            <ToolRow
              key={x.id}
              tool={toItem(x)}
              brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))}
              people={people.map((p: any) => ({ id: p.id, name: p.name }))}
              canManage={canManage}
              canDelete={canDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  const requestsBlock = (list: any[], title: string) => (
    <div className="mb-4 space-y-2">
      <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
      {list.length === 0 && (
        <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-400">
          {t("tools.requests.empty")}
        </p>
      )}
      {list.map((r: any) => (
        <div
          key={r.id}
          className={
            "flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 text-sm " +
            (r.status === "NEW" ? "border-brand-orange/60" : "border-neutral-200 opacity-70")
          }
        >
          <span
            className={
              "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
              (r.status === "NEW"
                ? "bg-brand-orange/15 text-brand-orange"
                : r.status === "DONE"
                  ? "bg-brand/10 text-brand-dark"
                  : "bg-neutral-200 text-neutral-600")
            }
          >
            {t(`tools.requests.status.${r.status}` as any)}
          </span>
          <span className="text-xs text-neutral-400">{fmt(r.createdAt)}</span>
          <span className="font-medium">{r.requestedBy?.name ?? "—"}</span>
          <span className="flex-1 whitespace-pre-wrap text-neutral-700">{r.text}</span>
          {r.status === "NEW" && canManage && <ToolRequestActions requestId={r.id} />}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("tools.title")}</h1>
        {canManage && <AddToolForm />}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
        {TABS.map((tb) => {
          // закупку бачать лише керівник, директор, комірник
          if (tb === "purchase" && !["ADMIN", "VIEWER", "STOREKEEPER"].includes(role)) return null;
          const badge =
            tb === "purchase"
              ? purchaseRequests.filter((r: any) => r.status === "NEW").length
              : tb === "warehouse"
                ? issueRequests.filter((r: any) => r.status === "NEW").length
                : 0;
          return (
            <Link
              key={tb}
              href={`/tools?tab=${tb}`}
              className={
                "rounded-lg px-4 py-2 text-sm font-medium transition " +
                (tab === tb ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-800")
              }
            >
              {t(`tools.tabs.${tb}` as any)}
              {badge > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {tab === "purchase" ? (
        requestsBlock(purchaseRequests, t("tools.requests.purchaseTitle"))
      ) : (
        <>
          {tab === "warehouse" &&
            canManage &&
            requestsBlock(
              issueRequests.filter((r: any) => r.status === "NEW"),
              t("tools.requests.issueTitle")
            )}
          {tab === "brigades" ? (
            <div className="space-y-4">
              {brigades
                .filter((b: any) => !isField || b.id === session.user.brigadeId)
                .map((b: any) => {
                  const list = filtered.filter((x) => x.holderBrigadeId === b.id);
                  if (list.length === 0 && isField) return null;
                  return (
                    <div key={b.id}>
                      <h2 className="mb-1.5 text-sm font-semibold text-neutral-700">
                        {b.name}{" "}
                        <span className="font-normal text-neutral-400">({list.length})</span>
                      </h2>
                      {table(list)}
                    </div>
                  );
                })}
            </div>
          ) : (
            table(filtered)
          )}
        </>
      )}
    </div>
  );
}
