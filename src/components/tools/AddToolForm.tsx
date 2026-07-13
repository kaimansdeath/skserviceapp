"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addTool } from "@/app/actions/tools";
import { inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

const CLASSES = ["HAND", "ELECTRIC", "MEASURING", "TOOLING", "MODULES"] as const;

export default function AddToolForm() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", inventoryNumber: "", toolClass: "HAND", note: "" });

  if (!open) {
    return (
      <button className={btnPrimary} onClick={() => setOpen(true)}>
        + {t("add")}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand/30 bg-brand/5 p-3">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("fields.name")}</span>
        <input
          className={inputCls + " w-56"}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("fields.inv")}</span>
        <input
          className={inputCls + " w-36"}
          value={form.inventoryNumber}
          onChange={(e) => setForm({ ...form, inventoryNumber: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("fields.class")}</span>
        <select
          className={inputCls + " w-44"}
          value={form.toolClass}
          onChange={(e) => setForm({ ...form, toolClass: e.target.value })}
        >
          {CLASSES.map((c) => (
            <option key={c} value={c}>{t(`class.${c}` as any)}</option>
          ))}
        </select>
      </label>
      <label className="block flex-1">
        <span className="mb-1 block text-xs text-neutral-500">{t("fields.note")}</span>
        <input
          className={inputCls}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </label>
      <button
        className={btnPrimary}
        disabled={pending || !form.name.trim()}
        onClick={() =>
          startTransition(async () => {
            await addTool({
              name: form.name,
              inventoryNumber: form.inventoryNumber || null,
              toolClass: form.toolClass as any,
              note: form.note || null,
            });
            setForm({ name: "", inventoryNumber: "", toolClass: "HAND", note: "" });
            setOpen(false);
            router.refresh();
          })
        }
      >
        {pending ? tc("saving") : tc("add")}
      </button>
      <button className={btnSecondary} onClick={() => setOpen(false)}>
        {tc("cancel")}
      </button>
    </div>
  );
}
