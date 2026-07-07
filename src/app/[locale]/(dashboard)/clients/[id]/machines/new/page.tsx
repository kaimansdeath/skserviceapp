import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MachineForm from "@/components/clients/MachineForm";

export default async function NewMachinePage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/clients/${params.id}`);

  const [client, types] = await Promise.all([
    prisma.client.findUnique({ where: { id: params.id } }),
    prisma.machineType.findMany({ orderBy: { nameUk: "asc" } }),
  ]);
  if (!client) notFound();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">{t("machines.new")}</h1>
      <p className="mb-4 text-sm text-neutral-500">{client.name}</p>
      <MachineForm
        clientId={client.id}
        types={types.map((tp: any) => ({
          id: tp.id,
          name: locale === "ru" ? tp.nameRu : tp.nameUk,
        }))}
      />
    </div>
  );
}
