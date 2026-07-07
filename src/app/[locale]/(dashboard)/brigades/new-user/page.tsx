import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserForm from "@/components/brigades/UserForm";

export default async function NewUserPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect(`/${params.locale}/brigades`);
  const brigades = await prisma.brigade.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("brigades.newUser")}</h1>
      <UserForm brigades={brigades.map((b: any) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
