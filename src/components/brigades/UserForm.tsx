"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/actions/brigades";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

export default function UserForm({ brigades }: { brigades: { id: string; name: string }[] }) {
  const t = useTranslations("brigades");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
    role: "BRIGADE_LEADER" as "ADMIN" | "BRIGADE_LEADER" | "VIEWER" | "ACCOUNTANT",
    brigadeId: "",
  });

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createUser(form);
      if ("error" in res) {
        setError(res.error === "LOGIN_TAKEN" ? t("loginTaken") : tc("error"));
        return;
      }
      router.push(`/${locale}/brigades`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <Field label={t("fields.name")}>
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.login")}>
          <input className={inputCls} value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
        </Field>
        <Field label={t("fields.password")}>
          <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label={t("fields.role")}>
          <select
            className={inputCls}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as any })}
          >
            <option value="BRIGADE_LEADER">{tr("BRIGADE_LEADER")}</option>
            <option value="ADMIN">{tr("ADMIN")}</option>
            <option value="VIEWER">{tr("VIEWER")}</option>
            <option value="ACCOUNTANT">{tr("ACCOUNTANT")}</option>
          </select>
        </Field>
        {form.role === "BRIGADE_LEADER" && (
          <Field label={t("fields.brigade")}>
            <select
              className={inputCls}
              value={form.brigadeId}
              onChange={(e) => setForm({ ...form, brigadeId: e.target.value })}
            >
              <option value="" disabled>—</option>
              {brigades.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          className={btnPrimary}
          disabled={
            pending ||
            !form.name ||
            form.login.length < 3 ||
            form.password.length < 8 ||
            (form.role === "BRIGADE_LEADER" && !form.brigadeId)
          }
          onClick={submit}
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <button className={btnSecondary} onClick={() => router.back()}>{tc("cancel")}</button>
      </div>
    </div>
  );
}
