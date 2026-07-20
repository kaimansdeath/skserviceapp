"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addServiceRequest } from "@/app/actions/requests";
import { inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

/** Ручне створення заявки з вебу — для питань, що "висять" поза ботом */
export default function AddServiceRequestForm() {
  const t = useTranslations("requests.manual");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    serialNumber: "",
    machineTypeText: "",
    modelText: "",
    contactName: "",
    contactPhone: "",
    problem: "",
  });

  if (!open) {
    return (
      <button
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        onClick={() => setOpen(true)}
      >
        + {t("add")}
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("serial")}</span>
          <input
            className={inputCls}
            placeholder={t("serialHint")}
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("type")}</span>
          <input
            className={inputCls}
            value={form.machineTypeText}
            onChange={(e) => setForm({ ...form, machineTypeText: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("model")}</span>
          <input
            className={inputCls}
            value={form.modelText}
            onChange={(e) => setForm({ ...form, modelText: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("contactName")}</span>
          <input
            className={inputCls}
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("contactPhone")}</span>
          <input
            className={inputCls}
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("problem")}</span>
        <textarea
          className={inputCls + " min-h-20"}
          value={form.problem}
          onChange={(e) => setForm({ ...form, problem: e.target.value })}
        />
      </label>
      <div className="flex gap-2">
        <button
          className={btnPrimary}
          disabled={pending || !form.problem.trim()}
          onClick={() =>
            startTransition(async () => {
              await addServiceRequest({
                serialNumber: form.serialNumber || null,
                machineTypeText: form.machineTypeText || null,
                modelText: form.modelText || null,
                contactName: form.contactName || null,
                contactPhone: form.contactPhone || null,
                problem: form.problem,
              });
              setForm({
                serialNumber: "",
                machineTypeText: "",
                modelText: "",
                contactName: "",
                contactPhone: "",
                problem: "",
              });
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
    </div>
  );
}
