"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { inputCls } from "@/components/ui/Field";

export default function ReportControls({ month }: { month: string }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("month")}</span>
        <input
          type="month"
          className={inputCls + " w-44"}
          value={month}
          onChange={(e) => {
            const params = new URLSearchParams(sp.toString());
            params.set("month", e.target.value);
            router.replace(`${pathname}?${params.toString()}`);
          }}
        />
      </label>
      <a
        href={`/api/export/report?month=${month}&locale=${locale}`}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        ⤓ {t("exportExcel")}
      </a>
    </div>
  );
}
