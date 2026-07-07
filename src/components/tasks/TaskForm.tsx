"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createTask, updateTask, checkOverlap, type TaskInput } from "@/app/actions/tasks";
import { ALL_STATUSES, type TaskStatusValue } from "@/lib/taskStatus";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

export type ClientOption = {
  id: string;
  name: string;
  city: string;
  oblast: string;
  machines: { id: string; label: string }[];
};

type Initial = Partial<TaskInput> & {
  id?: string;
  status?: TaskStatusValue;
  failureReason?: string | null;
};

export default function TaskForm({
  clients,
  brigades,
  initial,
  isAdmin,
}: {
  clients: ClientOption[];
  brigades: { id: string; name: string }[];
  initial?: Initial;
  isAdmin: boolean;
}) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<TaskInput & { status?: TaskStatusValue; failureReason?: string }>(
    {
      brigadeId: initial?.brigadeId ?? "",
      clientId: initial?.clientId ?? "",
      machineId: initial?.machineId ?? "",
      city: initial?.city ?? "",
      oblast: initial?.oblast ?? "",
      invoiceNumber: initial?.invoiceNumber ?? "",
      note: initial?.note ?? "",
      dateFrom: initial?.dateFrom ?? "",
      dateTo: initial?.dateTo ?? "",
      status: initial?.status,
      failureReason: initial?.failureReason ?? "",
    }
  );
  const [overlaps, setOverlaps] = useState<
    { id: string; client: string; city: string; dateFrom: string; dateTo: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.clientId),
    [clients, form.clientId]
  );

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onClientChange(clientId: string) {
    const c = clients.find((x) => x.id === clientId);
    setForm((f) => ({
      ...f,
      clientId,
      machineId: "",
      // підставляємо місто/область клієнта, якщо поля порожні або збігалися з попереднім клієнтом
      city: c ? c.city : f.city,
      oblast: c ? c.oblast : f.oblast,
    }));
  }

  // Перевірка перетину дат — попередження, не блокування
  useEffect(() => {
    let cancelled = false;
    if (form.brigadeId && form.dateFrom && form.dateTo && form.dateTo >= form.dateFrom) {
      checkOverlap({
        brigadeId: form.brigadeId,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        excludeTaskId: initial?.id,
      }).then((r) => {
        if (!cancelled) setOverlaps(r);
      });
    } else {
      setOverlaps([]);
    }
    return () => {
      cancelled = true;
    };
  }, [form.brigadeId, form.dateFrom, form.dateTo, initial?.id]);

  const dateRangeInvalid =
    !!form.dateFrom && !!form.dateTo && form.dateTo < form.dateFrom;

  function submit() {
    setError(null);
    if (dateRangeInvalid) {
      setError(t("dateRangeError"));
      return;
    }
    startTransition(async () => {
      const payload: TaskInput = {
        brigadeId: form.brigadeId,
        clientId: form.clientId,
        machineId: form.machineId || null,
        city: form.city,
        oblast: form.oblast,
        invoiceNumber: form.invoiceNumber || null,
        note: form.note || null,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
      };
      const res = initial?.id
        ? await updateTask(initial.id, {
            ...payload,
            status: form.status,
            failureReason: form.failureReason || null,
          })
        : await createTask(payload);
      if ("error" in res) {
        setError(res.error === "DATE_RANGE" ? t("dateRangeError") : tc("error"));
        return;
      }
      router.push(`/${locale}/tasks/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.brigade")}>
          <select
            className={inputCls}
            value={form.brigadeId}
            onChange={(e) => set("brigadeId", e.target.value)}
          >
            <option value="" disabled>—</option>
            {brigades.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("fields.client")}>
          <select
            className={inputCls}
            value={form.clientId}
            onChange={(e) => onClientChange(e.target.value)}
          >
            <option value="" disabled>—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("fields.machine")}>
          <select
            className={inputCls}
            value={form.machineId ?? ""}
            onChange={(e) => set("machineId", e.target.value)}
            disabled={!selectedClient}
          >
            <option value="">{t("fields.noMachine")}</option>
            {selectedClient?.machines.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t("fields.invoice")}>
          <input
            className={inputCls}
            value={form.invoiceNumber ?? ""}
            onChange={(e) => set("invoiceNumber", e.target.value)}
          />
        </Field>
        <Field label={t("fields.city")}>
          <input
            className={inputCls}
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
        <Field label={t("fields.oblast")}>
          <input
            className={inputCls}
            value={form.oblast}
            onChange={(e) => set("oblast", e.target.value)}
          />
        </Field>
        <Field label={t("fields.dateFrom")}>
          <input
            type="date"
            className={inputCls}
            value={form.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
          />
        </Field>
        <Field label={t("fields.dateTo")}>
          <input
            type="date"
            className={inputCls}
            value={form.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("fields.note")}>
        <textarea
          className={inputCls}
          rows={3}
          value={form.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
        />
      </Field>

      {initial?.id && isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.status")}>
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => set("status", e.target.value as TaskStatusValue)}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{ts(s as any)}</option>
              ))}
            </select>
          </Field>
          {form.status === "NOT_DONE" && (
            <Field label={t("fields.failureReason")}>
              <input
                className={inputCls}
                value={form.failureReason ?? ""}
                onChange={(e) => set("failureReason", e.target.value)}
              />
            </Field>
          )}
        </div>
      )}

      {dateRangeInvalid && (
        <p className="text-sm font-medium text-red-600">{t("dateRangeError")}</p>
      )}

      {overlaps.length > 0 && (
        <div className="rounded-lg border border-brand-orange/40 bg-orange-50 p-3 text-sm">
          <p className="mb-1 font-semibold text-brand-orange">{t("overlapWarning")}</p>
          <ul className="list-inside list-disc text-neutral-700">
            {overlaps.map((o) => (
              <li key={o.id}>
                {o.dateFrom} — {o.dateTo}: {o.client}, {o.city}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          className={btnPrimary}
          disabled={
            pending ||
            !form.brigadeId ||
            !form.clientId ||
            !form.city ||
            !form.oblast ||
            !form.dateFrom ||
            !form.dateTo
          }
          onClick={submit}
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <button className={btnSecondary} onClick={() => router.back()}>
          {tc("cancel")}
        </button>
      </div>
    </div>
  );
}
