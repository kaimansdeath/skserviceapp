"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { inputCls, btnSecondary } from "@/components/ui/Field";

export default function MachinesFilters({
  types,
  managers,
}: {
  types: { id: string; name: string }[];
  managers: { id: string; name: string }[];
}) {
  const t = useTranslations();
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
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("machines.fields.type")}</span>
        <select
          className={inputCls + " w-56"}
          value={sp.get("type") ?? ""}
          onChange={(e) => setParam("type", e.target.value)}
        >
          <option value="">{t("tasks.filters.all")}</option>
          {types.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("clients.fields.manager")}</span>
        <select
          className={inputCls + " w-44"}
          value={sp.get("manager") ?? ""}
          onChange={(e) => setParam("manager", e.target.value)}
        >
          <option value="">{t("tasks.filters.all")}</option>
          {managers.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("clients.fields.city")}</span>
        <input
          className={inputCls + " w-44"}
          defaultValue={sp.get("city") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("city", (e.target as HTMLInputElement).value.trim());
          }}
          onBlur={(e) => setParam("city", e.target.value.trim())}
        />
      </label>
      <button className={btnSecondary} onClick={() => router.replace(pathname)}>
        {t("tasks.filters.reset")}
      </button>
    </div>
  );
}
