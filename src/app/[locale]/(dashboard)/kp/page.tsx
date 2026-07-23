import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import KpTabs from "@/components/kp/KpTabs";

export const dynamic = "force-dynamic";

/** Модуль «КП»: генерація комерційних пропозицій (лише керівник відділу) */
export default async function KpPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") {
    redirect(`/${params.locale}`);
  }

  const aiReady = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("kp.title")}</h1>
      {!aiReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {t("kp.noApiKey")}
        </div>
      )}
      <KpTabs />
    </div>
  );
}
