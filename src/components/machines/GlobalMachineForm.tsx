"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { saveMachine } from "@/app/actions/clients";
import { WARRANTY_OPTIONS } from "@/lib/warranty";
import { Field, inputCls, btnPrimary } from "@/components/ui/Field";

export default function GlobalMachineForm({
  clients,
  types,
}: {
  clients: { id: string; name: string; city: string }[];
  types: { id: string; name: string }[];
}) {
  const t = useTranslations("machines.fields");
  const tt = useTranslations("tasks.fields");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    clientId: "",
    typeId: "",
    model: "",
    serialNumber: "",
    warrantyMonths: 12,
    note: "",
  });

  const filtered = q.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : clients;
  const selected = clients.find((c) => c.id === form.clientId);

  return (
    <div className="max-w-xl space-y-4">
      <Field label={tt("client")}>
        <input
          className={inputCls + " mb-1.5"}
          placeholder={tt("clientSearch")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={inputCls}
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
        >
          <option value="" disabled>—</option>
          {selected && !filtered.some((c) => c.id === selected.id) && (
            <option value={selected.id}>{selected.name} ({selected.city})</option>
          )}
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
          ))}
        </select>
      </Field>
      <Field label={t("type")}>
        <select
          className={inputCls}
          value={form.typeId}
          onChange={(e) => setForm({ ...form, typeId: e.target.value })}
        >
          <option value="" disabled>—</option>
          {types.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </Field>
      <Field label={t("model")}>
        <input
          className={inputCls}
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("serial")}>
          <input
            className={inputCls}
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
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
      </div>
      <Field label={t("note")}>
        <input
          className={inputCls}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </Field>
      <button
        className={btnPrimary}
        disabled={pending || !form.clientId || !form.typeId || !form.model.trim()}
        onClick={() =>
          startTransition(async () => {
            const res = await saveMachine(null, {
              clientId: form.clientId,
              typeId: form.typeId,
              model: form.model,
              serialNumber: form.serialNumber || null,
              warrantyMonths: form.warrantyMonths,
              note: form.note || null,
            });
            if (!("error" in res)) router.push("../machines");
          })
        }
      >
        {pending ? tc("saving") : tc("save")}
      </button>
    </div>
  );
}
