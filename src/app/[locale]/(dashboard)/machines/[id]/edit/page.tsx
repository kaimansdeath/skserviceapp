import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MachineForm from "@/components/clients/MachineForm";

export default async function EditMachinePage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/machines/${params.id}`);

  const [machine, types] = await Promise.all([
    prisma.machine.findUnique({ where: { id: params.id } }),
    prisma.machineType.findMany({ orderBy: { nameUk: "asc" } }),
  ]);
  if (!machine) notFound();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("machines.edit")}</h1>
      <MachineForm
        clientId={machine.clientId}
        types={types.map((tp: any) => ({
          id: tp.id,
          name: locale === "ru" ? tp.nameRu : tp.nameUk,
        }))}
        initial={machine as any}
      />
    </div>
  );
}
