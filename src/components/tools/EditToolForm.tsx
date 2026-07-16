"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { editTool } from "@/app/actions/tools";
import { inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

const CLASSES = [
  "HAND", "ELECTRIC", "MEASURING", "TOOLING", "MODULES", "ZIP", "CONSUMABLES", "OTHER",
] as const;

export default function EditToolForm({
  toolId,
  initial,
}: {
  toolId: string;
  initial: {
    name: string;
    manufacturer: string | null;
    inventoryNumber: string | null;
    toolClass: string;
    note: string | null;
  };
}) {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: initial.name,
    manufacturer: initial.manufacturer ?? "",
    inventoryNumber: initial.inventoryNumber ?? "",
    toolClass: initial.toolClass,
    note: initial.note ?? "",
  });

  if (!open) {
    return (
      <button
        className="text-xs font-semibold text-brand-dark hover:underline"
        title={t("edit")}
        onClick={() => setOpen(true)}
      >
        ✎
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-brand/30 bg-brand/5 p-3 text-left">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("fields.name")}</span>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("fields.manufacturer")}</span>
          <input
            className={inputCls}
            value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("fields.inv")}</span>
          <input
            className={inputCls}
            value={form.inventoryNumber}
            onChange={(e) => setForm({ ...form, inventoryNumber: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("fields.class")}</span>
          <select
            className={inputCls}
            value={form.toolClass}
            onChange={(e) => setForm({ ...form, toolClass: e.target.value })}
          >
            {CLASSES.map((c) => (
              <option key={c} value={c}>{t(`class.${c}` as any)}</option>
            ))}
          </select>
        </label>
        <label className="col-span-full block">
          <span className="mb-1 block text-xs text-neutral-500">{t("fields.note")}</span>
          <input
            className={inputCls}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          className={btnPrimary}
          disabled={pending || !form.name.trim()}
          onClick={() =>
            startTransition(async () => {
              await editTool(toolId, {
                name: form.name,
                manufacturer: form.manufacturer || null,
                inventoryNumber: form.inventoryNumber || null,
                toolClass: form.toolClass as any,
                note: form.note || null,
              });
              setOpen(false);
              router.refresh();
            })
          }
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <button className={btnSecondary} onClick={() => setOpen(false)}>
          {tc("cancel")}
        </button>
      </div>
    </div>
  );
}
