"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { inputCls, btnSecondary } from "@/components/ui/Field";

export default function MapControls({ brigades }: { brigades: { id: string; name: string }[] }) {
  const t = useTranslations("dashboard.map");
  const tf = useTranslations("tasks.filters");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const periodActive = !!(sp.get("mfrom") && sp.get("mto"));

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{tf("from")}</span>
        <input
          type="date"
          className={inputCls + " w-40"}
          value={sp.get("mfrom") ?? ""}
          onChange={(e) => setParam("mfrom", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{tf("to")}</span>
        <input
          type="date"
          className={inputCls + " w-40"}
          value={sp.get("mto") ?? ""}
          onChange={(e) => setParam("mto", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{tf("brigade")}</span>
        <select
          className={inputCls + " w-48"}
          value={sp.get("mbrig") ?? ""}
          onChange={(e) => setParam("mbrig", e.target.value)}
        >
          <option value="">{tf("all")}</option>
          {brigades.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
      {periodActive && (
        <button
          className={btnSecondary}
          onClick={() => {
            const params = new URLSearchParams(sp.toString());
            params.delete("mfrom");
            params.delete("mto");
            params.delete("mbrig");
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}
        >
          {t("liveMode")}
        </button>
      )}
      <span className="pb-2 text-xs text-neutral-400">
        {periodActive ? t("periodHint") : t("liveHint")}
      </span>
    </div>
  );
}
