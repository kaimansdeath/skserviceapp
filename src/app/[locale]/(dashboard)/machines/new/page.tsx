import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import GlobalMachineForm from "@/components/machines/GlobalMachineForm";

export const dynamic = "force-dynamic";

export default async function NewMachinePage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/machines`);

  const [clients, types] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.machineType.findMany({ orderBy: { nameUk: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("machinesList.addMachine")}</h1>
      <GlobalMachineForm
        clients={clients.map((c: any) => ({ id: c.id, name: c.name, city: c.city }))}
        types={types.map((x: any) => ({
          id: x.id,
          name: locale === "ru" ? x.nameRu : x.nameUk,
        }))}
      />
    </div>
  );
}
