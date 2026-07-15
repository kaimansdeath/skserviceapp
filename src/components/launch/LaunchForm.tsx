"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createLaunchRequest } from "@/app/actions/launch";
import { Field, inputCls, btnPrimary } from "@/components/ui/Field";

/** Публічна форма заявки на запуск верстата (для менеджерів) */
export default function LaunchForm({
  managers,
}: {
  managers: { id: string; name: string }[];
}) {
  const t = useTranslations("launch");
  const [pending, startTransition] = useTransition();
  const [doneNumber, setDoneNumber] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({
    managerId: "",
    clientName: "",
    contactInfo: "",
    city: "",
    machineText: "",
    desiredDate: "",
    note: "",
  });

  if (doneNumber !== null) {
    return (
      <div className="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
        <p className="mb-1 text-3xl">✅</p>
        <p className="text-lg font-bold text-brand-dark">
          {t("success", { number: doneNumber })}
        </p>
        <p className="mt-1 text-sm text-neutral-500">{t("successHint")}</p>
        <button
          className="mt-4 text-sm font-semibold text-brand-dark hover:underline"
          onClick={() => {
            setDoneNumber(null);
            setForm({
              managerId: form.managerId,
              clientName: "",
              contactInfo: "",
              city: "",
              machineText: "",
              desiredDate: "",
              note: "",
            });
          }}
        >
          {t("another")}
        </button>
      </div>
    );
  }

  const canSubmit = form.managerId && form.clientName.trim() && form.machineText.trim();

  return (
    <div className="space-y-4">
      <Field label={t("fields.manager")}>
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
      </Field>
      <Field label={t("fields.client")}>
        <input
          className={inputCls}
          value={form.clientName}
          onChange={(e) => setForm({ ...form, clientName: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.contact")}>
          <input
            className={inputCls}
            placeholder={t("fields.contactPlaceholder")}
            value={form.contactInfo}
            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
          />
        </Field>
        <Field label={t("fields.city")}>
          <input
            className={inputCls}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t("fields.machine")}>
        <input
          className={inputCls}
          placeholder={t("fields.machinePlaceholder")}
          value={form.machineText}
          onChange={(e) => setForm({ ...form, machineText: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.desiredDate")}>
          <input
            type="date"
            className={inputCls}
            value={form.desiredDate}
            onChange={(e) => setForm({ ...form, desiredDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t("fields.note")}>
        <textarea
          className={inputCls + " min-h-20"}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </Field>
      {error && <p className="text-sm text-red-600">{t("error")}</p>}
      <button
        className={btnPrimary + " w-full"}
        disabled={pending || !canSubmit}
        onClick={() =>
          startTransition(async () => {
            setError(false);
            const res = await createLaunchRequest({
              managerId: form.managerId,
              clientName: form.clientName,
              contactInfo: form.contactInfo || null,
              city: form.city || null,
              machineText: form.machineText,
              desiredDate: form.desiredDate || null,
              note: form.note || null,
            });
            if ("error" in res) setError(true);
            else setDoneNumber(res.number);
          })
        }
      >
        {pending ? "…" : t("submit")}
      </button>
    </div>
  );
}
