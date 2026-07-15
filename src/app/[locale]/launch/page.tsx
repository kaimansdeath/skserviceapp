import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import LaunchForm from "@/components/launch/LaunchForm";

export const dynamic = "force-dynamic";

/** Публічна сторінка заявки на запуск верстата — доступна за прямим URL без входу */
export default async function LaunchPage() {
  const t = await getTranslations("launch");
  const managers = await prisma.manager.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-lg font-extrabold tracking-tight text-brand-dark">
            СТАН КОМПЛЕКТ
          </p>
          <h1 className="mt-1 text-xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <LaunchForm managers={managers.map((m: any) => ({ id: m.id, name: m.name }))} />
        </div>
      </div>
    </div>
  );
}
