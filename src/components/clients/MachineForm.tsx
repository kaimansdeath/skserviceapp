"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { saveMachine } from "@/app/actions/clients";
import { WARRANTY_OPTIONS } from "@/lib/warranty";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

type Initial = {
  id?: string;
  typeId?: string;
  model?: string;
  serialNumber?: string | null;
  warrantyMonths?: number;
  note?: string | null;
};

export default function MachineForm({
  clientId,
  types,
  initial,
}: {
  clientId: string;
  types: { id: string; name: string }[];
  initial?: Initial;
}) {
  const t = useTranslations("machines.fields");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const [form, setForm] = useState({
    typeId: initial?.typeId ?? "",
    model: initial?.model ?? "",
    serialNumber: initial?.serialNumber ?? "",
    warrantyMonths: initial?.warrantyMonths ?? 12,
    note: initial?.note ?? "",
  });

  function submit() {
    setError(false);
    startTransition(async () => {
      const res = await saveMachine(initial?.id ?? null, { clientId, ...form });
      if ("error" in res) {
        setError(true);
        return;
      }
      router.push(`/${locale}/machines/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <Field label={t("type")}>
        <select className={inputCls} value={form.typeId} onChange={(e) => setForm({ ...form, typeId: e.target.value })}>
          <option value="" disabled>—</option>
          {types.map((tp) => (
            <option key={tp.id} value={tp.id}>{tp.name}</option>
          ))}
        </select>
      </Field>
      <Field label={t("model")}>
        <input className={inputCls} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
      </Field>
      <Field label={t("serial")}>
        <input className={inputCls} value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
      </Field>
      <Field label={t("warranty")}>
        <select
          className={inputCls}
          value={form.warrantyMonths}
          onChange={(e) => setForm({ ...form, warrantyMonths: Number(e.target.value) })}
        >
          {WARRANTY_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>
      <Field label={t("note")}>
        <textarea className={inputCls} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      {error && <p className="text-sm text-red-600">{tc("error")}</p>}
      <div className="flex gap-3">
        <button className={btnPrimary} disabled={pending || !form.typeId || !form.model} onClick={submit}>
          {pending ? tc("saving") : tc("save")}
        </button>
        <button className={btnSecondary} onClick={() => router.back()}>{tc("cancel")}</button>
      </div>
    </div>
  );
}
