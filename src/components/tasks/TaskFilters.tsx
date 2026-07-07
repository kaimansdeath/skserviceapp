"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ALL_STATUSES } from "@/lib/taskStatus";
import { inputCls, btnSecondary } from "@/components/ui/Field";

type Brigade = { id: string; name: string };

export default function TaskFilters({
  brigades,
  lockBrigade,
}: {
  brigades: Brigade[];
  lockBrigade?: string | null;
}) {
  const t = useTranslations("tasks.filters");
  const ts = useTranslations("status");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3">
      {!lockBrigade && (
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("brigade")}</span>
          <select
            className={inputCls + " w-44"}
            value={sp.get("brigade") ?? ""}
            onChange={(e) => setParam("brigade", e.target.value)}
          >
            <option value="">{t("all")}</option>
            {brigades.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("status")}</span>
        <select
          className={inputCls + " w-48"}
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">{t("all")}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{ts(s as any)}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("from")}</span>
        <input
          type="date"
          className={inputCls + " w-40"}
          value={sp.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("to")}</span>
        <input
          type="date"
          className={inputCls + " w-40"}
          value={sp.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("city")}</span>
        <input
          className={inputCls + " w-40"}
          defaultValue={sp.get("city") ?? ""}
          onBlur={(e) => setParam("city", e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("city", (e.target as HTMLInputElement).value.trim());
          }}
        />
      </label>
      <button className={btnSecondary} onClick={() => router.replace(pathname)}>
        {t("reset")}
      </button>
    </div>
  );
}
