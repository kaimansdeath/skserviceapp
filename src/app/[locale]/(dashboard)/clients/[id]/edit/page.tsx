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
  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("clients.edit")}</h1>
      <ClientForm initial={client as any} />
    </div>
  );
}
