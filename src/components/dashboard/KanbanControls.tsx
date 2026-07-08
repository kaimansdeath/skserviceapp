"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { inputCls } from "@/components/ui/Field";

export default function KanbanControls({
  brigades,
  defaultMonth,
}: {
  brigades: { id: string; name: string }[];
  defaultMonth: string;
}) {
  const tf = useTranslations("tasks.filters");
  const t = useTranslations("dashboard.kanban");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("month")}</span>
        <input
          type="month"
          className={inputCls + " w-44"}
          value={sp.get("kmonth") ?? defaultMonth}
          onChange={(e) => setParam("kmonth", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{tf("brigade")}</span>
        <select
          className={inputCls + " w-48"}
          value={sp.get("kbrig") ?? ""}
          onChange={(e) => setParam("kbrig", e.target.value)}
        >
          <option value="">{tf("all")}</option>
          {brigades.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
