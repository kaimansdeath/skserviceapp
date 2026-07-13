import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Картка інструменту: розподіл по місцях і журнал змін */
export default async function ToolPage({ params }: { params: { id: string } }) {
  const t = await getTranslations();
  const tool = await prisma.tool.findUnique({
    where: { id: params.id },
    include: {
      allocations: { include: { brigade: true, user: true } },
      movements: { include: { byUser: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!tool) notFound();

  const fmt = (d: Date) =>
    new Date(d).toLocaleString("uk-UA", {
      timeZone: "Europe/Kyiv",
      dateStyle: "short",
      timeStyle: "short",
    });

  const holderLines = (tool.allocations as any[])
    .filter((a) => a.quantity > 0)
    .map((a) => {
      const label =
        a.holderKind === "WAREHOUSE"
          ? t("tools.warehouse")
          : a.holderKind === "BRIGADE"
            ? a.brigade?.name ?? "?"
            : a.user?.name ?? "?";
      return `${label}: ${a.quantity}`;
    });

  return (
    <div className="max-w-3xl">
      <Link href="/tools" className="text-sm text-neutral-400 hover:text-neutral-600">
        ← {t("tools.title")}
      </Link>
      <h1 className="mb-1 mt-1 text-xl font-bold">{tool.name}</h1>
      <p className="mb-1 text-sm text-neutral-500">
        {tool.manufacturer ? `${tool.manufacturer} · ` : ""}
        {tool.inventoryNumber ? `${t("tools.fields.inv")}: ${tool.inventoryNumber} · ` : ""}
        {t(`tools.class.${tool.toolClass}` as any)} ·{" "}
        {t(`tools.status.${tool.status}` as any)} ·{" "}
        {t("tools.fields.quantity")}: {tool.quantity}
        {tool.note ? ` · ${tool.note}` : ""}
      </p>
      <p className="mb-4 text-sm text-neutral-700">{holderLines.join(" · ") || "—"}</p>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("tools.history")}</h2>
      <div className="rounded-xl border border-neutral-200 bg-white">
        <ul className="divide-y divide-neutral-100 text-sm">
          {tool.movements.length === 0 && (
            <li className="px-4 py-4 text-center text-neutral-400">—</li>
          )}
          {tool.movements.map((m: any) => (
            <li key={m.id} className="flex items-baseline gap-3 px-4 py-2">
              <span className="whitespace-nowrap text-xs text-neutral-400">{fmt(m.createdAt)}</span>
              <span className="flex-1">{m.text}</span>
              <span className="text-xs text-neutral-400">{m.byUser?.name ?? ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
