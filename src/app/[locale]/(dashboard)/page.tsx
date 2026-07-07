import { getTranslations } from "next-intl/server";

// Етап 4 замінить цю сторінку на карту + зведення дня
export default async function DashboardPage() {
  const t = await getTranslations();
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
      {t("common.underConstruction")}
    </div>
  );
}
