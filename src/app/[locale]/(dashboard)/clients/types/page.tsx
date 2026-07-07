import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TypeAddForm from "@/components/clients/TypeAddForm";

export const dynamic = "force-dynamic";

export default async function TypesPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/clients`);

  const types = await prisma.machineType.findMany({
    include: { _count: { select: { machines: true } } },
    orderBy: { nameUk: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">{t("clients.types.title")}</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <TypeAddForm />
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("clients.types.nameUk")}</th>
              <th className="px-3 py-2">{t("clients.types.nameRu")}</th>
              <th className="px-3 py-2 text-right">{t("clients.machinesCount")}</th>
            </tr>
          </thead>
          <tbody>
            {types.map((tp: any) => (
              <tr key={tp.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{tp.nameUk}</td>
                <td className="px-3 py-2">{tp.nameRu}</td>
                <td className="px-3 py-2 text-right">{tp._count.machines}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
