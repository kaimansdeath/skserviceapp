"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { inputCls, btnSecondary } from "@/components/ui/Field";

export default function ArchiveFilters({
  brigades,
  canExport,
}: {
  brigades: { id: string; name: string }[];
  canExport: boolean;
}) {
  const t = useTranslations("archive");
  const tf = useTranslations("tasks.filters");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const exportHref = `/api/export/archive?${new URLSearchParams({
    ...Object.fromEntries(sp.entries()),
    locale,
  }).toString()}`;

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("search")}</span>
        <input
          className={inputCls + " w-64"}
          placeholder={t("searchPlaceholder")}
          defaultValue={sp.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value.trim());
          }}
          onBlur={(e) => setParam("q", e.target.value.trim())}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{tf("brigade")}</span>
        <select
          className={inputCls + " w-44"}
          value={sp.get("brigade") ?? ""}
          onChange={(e) => setParam("brigade", e.target.value)}
        >
          <option value="">{tf("all")}</option>
          {brigades.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{tf("from")}</span>
        <input
          type="date"
          className={inputCls + " w-40"}
          value={sp.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{tf("to")}</span>
        <input
          type="date"
          className={inputCls + " w-40"}
          value={sp.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </label>
      <button className={btnSecondary} onClick={() => router.replace(pathname)}>
        {tf("reset")}
      </button>
      {canExport && (
        <a
          href={exportHref}
          className="ml-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          ⤓ {t("exportXlsx")}
        </a>
      )}
    </div>
  );
}
