import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ManagersSection from "@/components/clients/ManagersSection";

export const dynamic = "force-dynamic";

export default async function ManagersPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/clients`);

  const managers = await prisma.manager.findMany({
    include: { _count: { select: { clients: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">{t("clients.managers.title")}</h1>
      <ManagersSection
        managers={managers.map((m: any) => ({
          id: m.id,
          name: m.name,
          clientsCount: m._count.clients,
        }))}
      />
    </div>
  );
}
