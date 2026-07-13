import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import ToolRow, { type ToolItem } from "@/components/tools/ToolRow";
import AddToolForm from "@/components/tools/AddToolForm";
import AddToolRequestForm from "@/components/tools/AddToolRequestForm";
import ToolsExcelButtons from "@/components/tools/ToolsExcelButtons";
import ToolRequestActions from "@/components/tools/ToolRequestActions";

export const dynamic = "force-dynamic";

const TABS = ["brigades", "people", "warehouse", "tooling", "purchase"] as const;
type Tab = (typeof TABS)[number];

/** Інструмент: облік за кількістю, розподіл по місцях, склад, заявки */
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
      include: {
        allocations: { include: { brigade: true, user: true } },
      },
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

  function toItem(x: any): ToolItem {
    const allocations: Record<string, number> = {};
    const labels: string[] = [];
    for (const a of x.allocations) {
      const key =
        a.holderKind === "WAREHOUSE" ? "w" : a.holderKind === "BRIGADE" ? `b:${a.brigadeId}` : `p:${a.userId}`;
      allocations[key] = a.quantity;
      if (a.quantity > 0) {
        const label =
          a.holderKind === "WAREHOUSE"
            ? t("tools.warehouse")
            : a.holderKind === "BRIGADE"
              ? a.brigade?.name ?? "?"
              : a.user?.name ?? "?";
        labels.push(`${label}: ${a.quantity}`);
      }
    }
    return {
      id: x.id,
      name: x.name,
      manufacturer: x.manufacturer,
      inventoryNumber: x.inventoryNumber,
      toolClass: x.toolClass,
      status: x.status,
      quantity: x.quantity,
      allocations,
      holderSummary: labels.join(" · ") || "—",
    };
  }

  const items = (tools as any[]).map((x) => ({ raw: x, item: toItem(x) }));

  const visible = items.filter(({ raw }) => {
    if (!isField) return true;
    return (raw.allocations as any[]).some(
      (a) =>
        (a.holderKind === "BRIGADE" && a.brigadeId === session.user.brigadeId && a.quantity > 0) ||
        (a.holderKind === "PERSON" && a.userId === session.user.id && a.quantity > 0)
    );
  });

  let filtered = visible;
  if (tab === "people")
    filtered = visible.filter(({ raw }) =>
      (raw.allocations as any[]).some((a) => a.holderKind === "PERSON" && a.quantity > 0)
    );
  if (tab === "warehouse")
    filtered = visible.filter(({ raw }) =>
      (raw.allocations as any[]).some((a) => a.holderKind === "WAREHOUSE" && a.quantity > 0)
    );
  if (tab === "tooling")
    filtered = visible.filter(({ raw }) => ["TOOLING", "MODULES"].includes(raw.toolClass));
  if (tab === "brigades")
    filtered = visible.filter(({ raw }) =>
      (raw.allocations as any[]).some((a) => a.holderKind === "BRIGADE" && a.quantity > 0)
    );

  const fmt = (d: Date) =>
    new Date(d).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv", dateStyle: "short", timeStyle: "short" });

  const brigadeOptions = brigades.map((b: any) => ({ id: b.id, name: b.name }));
  const peopleOptions = people.map((p: any) => ({ id: p.id, name: p.name }));

  const table = (list: { item: ToolItem }[]) => (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-3 py-2">{t("tools.fields.name")}</th>
            <th className="px-3 py-2">{t("tools.fields.inv")}</th>
            <th className="px-3 py-2">{t("tools.fields.class")}</th>
            <th className="px-3 py-2 text-center">{t("tools.fields.quantity")}</th>
            <th className="px-3 py-2">{t("tools.fields.status")}</th>
            <th className="px-3 py-2">{t("tools.fields.holder")}</th>
            <th className="w-10 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                {t("tools.empty")}
              </td>
            </tr>
          )}
          {list.map(({ item }) => (
            <ToolRow
              key={item.id}
              tool={item}
              brigades={brigadeOptions}
              people={peopleOptions}
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
                : r.status === "APPROVED"
                  ? "bg-sky-100 text-sky-700"
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
          <ToolRequestActions requestId={r.id} kind={r.kind} status={r.status} role={role} />
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("tools.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {["ADMIN", "BRIGADE_LEADER", "STOREKEEPER"].includes(role) && <AddToolRequestForm />}
          {canManage && <ToolsExcelButtons />}
          {canManage && <AddToolForm />}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
        {TABS.map((tb) => {
          if (tb === "purchase" && !["ADMIN", "VIEWER", "STOREKEEPER"].includes(role)) return null;
          const badge =
            tb === "purchase"
              ? purchaseRequests.filter((r: any) => r.status === "NEW").length
              : tb === "warehouse"
                ? issueRequests.filter((r: any) => ["NEW", "APPROVED"].includes(r.status)).length
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
              issueRequests.filter((r: any) => ["NEW", "APPROVED"].includes(r.status)),
              t("tools.requests.issueTitle")
            )}
          {tab === "brigades" ? (
            <div className="space-y-4">
              {brigades
                .filter((b: any) => !isField || b.id === session.user.brigadeId)
                .map((b: any) => {
                  const list = filtered.filter(({ raw }) =>
                    (raw.allocations as any[]).some(
                      (a) => a.holderKind === "BRIGADE" && a.brigadeId === b.id && a.quantity > 0
                    )
                  );
                  if (list.length === 0 && isField) return null;
                  return (
                    <div key={b.id}>
                      <h2 className="mb-1.5 text-sm font-semibold text-neutral-700">
                        {b.name} <span className="font-normal text-neutral-400">({list.length})</span>
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
