"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { saveClient } from "@/app/actions/clients";
import { OBLASTS } from "@/lib/oblasts";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

type Initial = {
  id?: string;
  name?: string;
  edrpou?: string | null;
  city?: string;
  oblast?: string;
  note?: string | null;
};

export default function ClientForm({ initial }: { initial?: Initial }) {
  const t = useTranslations("clients.fields");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    edrpou: initial?.edrpou ?? "",
    city: initial?.city ?? "",
    oblast: initial?.oblast ?? "",
    note: initial?.note ?? "",
  });

  const oblastOptions: string[] = [...OBLASTS];
  if (form.oblast && !oblastOptions.includes(form.oblast)) oblastOptions.unshift(form.oblast);

  function submit() {
    setError(false);
    startTransition(async () => {
      const res = await saveClient(initial?.id ?? null, {
        ...form,
        edrpou: form.edrpou || null,
        note: form.note || null,
      });
      if ("error" in res) {
        setError(true);
        return;
      }
      router.push(`/${locale}/clients/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")}>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={t("edrpou")}>
          <input className={inputCls} value={form.edrpou} onChange={(e) => setForm({ ...form, edrpou: e.target.value })} />
        </Field>
        <Field label={t("city")}>
          <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label={t("oblast")}>
          <select
            className={inputCls}
            value={form.oblast}
            onChange={(e) => setForm({ ...form, oblast: e.target.value })}
          >
            <option value="" disabled>—</option>
            {oblastOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("note")}>
        <textarea className={inputCls} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      {error && <p className="text-sm text-red-600">{tc("error")}</p>}
      <div className="flex gap-3">
        <button className={btnPrimary} disabled={pending || !form.name || !form.city || !form.oblast} onClick={submit}>
          {pending ? tc("saving") : tc("save")}
        </button>
        <button className={btnSecondary} onClick={() => router.back()}>{tc("cancel")}</button>
      </div>
    </div>
  );
}
