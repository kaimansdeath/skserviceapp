import { getTranslations } from "next-intl/server";

export default async function SectionPage() {
  const t = await getTranslations();
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
      {t("common.underConstruction")}
    </div>
  );
}
