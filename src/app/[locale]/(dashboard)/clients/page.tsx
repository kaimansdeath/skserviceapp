import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { DeleteClientButton } from "@/components/clients/DeleteButtons";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const t = await getTranslations();
  const session = (await auth())!;
  if (["STOREKEEPER", "BRIGADE_LEADER", "BRIGADE_MEMBER"].includes(session.user.role)) redirect("/");
  const isAdmin = session.user.role === "ADMIN";

  const clients = await prisma.client.findMany({
    include: { _count: { select: { machines: true } }, contacts: { take: 1 } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("clients.title")}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Link
                href="/clients/managers"
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
              >
                {t("clients.managers.title")}
              </Link>
              <Link
                href="/clients/types"
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
              >
                {t("clients.types.manage")}
              </Link>
              <Link
                href="/clients/new"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                + {t("clients.new")}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("clients.fields.name")}</th>
              <th className="px-3 py-2">{t("clients.fields.city")}</th>
              <th className="px-3 py-2">{t("clients.fields.contacts")}</th>
              <th className="px-3 py-2 text-right">{t("clients.machinesCount")}</th>
              {isAdmin && <th className="w-10 px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-3 py-8 text-center text-neutral-400">
                  {t("clients.empty")}
                </td>
              </tr>
            )}
            {clients.map((c: any) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">
                  <Link href={`/clients/${c.id}`} className="font-medium text-brand-dark hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{c.city}, {c.oblast}</td>
                <td className="px-3 py-2 text-neutral-500">
                  {c.contacts[0]
                    ? `${c.contacts[0].fullName}${c.contacts[0].phone ? `, ${c.contacts[0].phone}` : ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">{c._count.machines}</td>
                {isAdmin && (
                  <td className="px-3 py-2">
                    <DeleteClientButton clientId={c.id} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
