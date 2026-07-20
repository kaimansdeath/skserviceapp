"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createLaunchRequest } from "@/app/actions/launch";
import { inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

/** Ручне створення заявки на запуск з вебу (адмін) — дзеркало публічної форми менеджерів */
export default function AddLaunchRequestForm({
  managers,
}: {
  managers: { id: string; name: string }[];
}) {
  const t = useTranslations("launch.fields");
  const tm = useTranslations("requests.manual");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    managerId: "",
    clientName: "",
    contactInfo: "",
    city: "",
    machineText: "",
    desiredDate: "",
    note: "",
  });

  if (!open) {
    return (
      <button
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        onClick={() => setOpen(true)}
      >
        + {tm("add")}
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("manager")}</span>
          <select
            className={inputCls}
            value={form.managerId}
            onChange={(e) => setForm({ ...form, managerId: e.target.value })}
          >
            <option value="" disabled>—</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("client")}</span>
          <input
            className={inputCls}
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("contact")}</span>
          <input
            className={inputCls}
            placeholder={t("contactPlaceholder")}
            value={form.contactInfo}
            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("city")}</span>
          <input
            className={inputCls}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("machine")}</span>
          <input
            className={inputCls}
            placeholder={t("machinePlaceholder")}
            value={form.machineText}
            onChange={(e) => setForm({ ...form, machineText: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">{t("desiredDate")}</span>
          <input
            type="date"
            className={inputCls}
            value={form.desiredDate}
            onChange={(e) => setForm({ ...form, desiredDate: e.target.value })}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("note")}</span>
        <input
          className={inputCls}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </label>
      <div className="flex gap-2">
        <button
          className={btnPrimary}
          disabled={pending || !form.managerId || !form.clientName.trim() || !form.machineText.trim()}
          onClick={() =>
            startTransition(async () => {
              await createLaunchRequest({
                managerId: form.managerId,
                clientName: form.clientName,
                contactInfo: form.contactInfo || null,
                city: form.city || null,
                machineText: form.machineText,
                desiredDate: form.desiredDate || null,
                note: form.note || null,
              });
              setForm({
                managerId: "",
                clientName: "",
                contactInfo: "",
                city: "",
                machineText: "",
                desiredDate: "",
                note: "",
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
