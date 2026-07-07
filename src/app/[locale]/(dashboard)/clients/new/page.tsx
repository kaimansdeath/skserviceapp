import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ClientForm from "@/components/clients/ClientForm";

export default async function NewClientPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/clients`);
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("clients.new")}</h1>
      <ClientForm />
    </div>
  );
}
