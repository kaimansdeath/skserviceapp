import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ClientForm from "@/components/clients/ClientForm";

export default async function EditClientPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/clients/${params.id}`);
  const [client, managers] = await Promise.all([
    prisma.client.findUnique({ where: { id: params.id } }),
    prisma.manager.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!client) notFound();
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("clients.edit")}</h1>
      <ClientForm
        initial={client as any}
        managers={managers.map((m: any) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
