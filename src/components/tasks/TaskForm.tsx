"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createTask, updateTask, checkOverlap, type TaskInput } from "@/app/actions/tasks";
import { saveClient } from "@/app/actions/clients";
import { ALL_STATUSES, type TaskStatusValue } from "@/lib/taskStatus";
import { OBLASTS } from "@/lib/oblasts";
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

function OblastSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options: string[] = [...OBLASTS];
  if (value && !options.includes(value)) options.unshift(value); // старі значення з БД
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export default function TaskForm({
  clients: clientsProp,
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
  const tcl = useTranslations("clients");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [clients, setClients] = useState<ClientOption[]>(clientsProp);
  const [form, setForm] = useState({
    executorType: (initial?.executorType ?? "BRIGADE") as "BRIGADE" | "OUTSOURCE",
    brigadeId: initial?.brigadeId ?? "",
    outsourceName: initial?.outsourceName ?? "",
    clientId: initial?.clientId ?? "",
    machineId: initial?.machineId ?? "",
    city: initial?.city ?? "",
    oblast: initial?.oblast ?? "",
    invoiceNumber: initial?.invoiceNumber ?? "",
    orderNumber: initial?.orderNumber ?? "",
    note: initial?.note ?? "",
    dateFrom: initial?.dateFrom ?? "",
    dateTo: initial?.dateTo ?? "",
    status: initial?.status,
    failureReason: initial?.failureReason ?? "",
  });
  const [overlaps, setOverlaps] = useState<
    { id: string; client: string; city: string; dateFrom: string; dateTo: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Швидке додавання клієнта
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [qc, setQc] = useState({ name: "", edrpou: "", city: "", oblast: "", contacts: "" });
  const [qcPending, startQcTransition] = useTransition();

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
      city: c ? c.city : f.city,
      oblast: c ? c.oblast : f.oblast,
    }));
  }

  function quickAddClient() {
    startQcTransition(async () => {
      const res = await saveClient(null, {
        name: qc.name,
        edrpou: qc.edrpou || null,
        city: qc.city,
        oblast: qc.oblast,
        contacts: qc.contacts || null,
        note: null,
      });
      if ("error" in res) return;
      const created: ClientOption = {
        id: res.id,
        name: qc.name.trim(),
        city: qc.city.trim(),
        oblast: qc.oblast,
        machines: [],
      };
      setClients((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, clientId: created.id, machineId: "", city: created.city, oblast: created.oblast }));
      setShowQuickClient(false);
      setQc({ name: "", edrpou: "", city: "", oblast: "", contacts: "" });
    });
  }

  // Перевірка перетину дат (лише для бригад) — попередження, не блокування
  useEffect(() => {
    let cancelled = false;
    if (
      form.executorType === "BRIGADE" &&
      form.brigadeId &&
      form.dateFrom &&
      form.dateTo &&
      form.dateTo >= form.dateFrom
    ) {
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
  }, [form.executorType, form.brigadeId, form.dateFrom, form.dateTo, initial?.id]);

  const dateRangeInvalid = !!form.dateFrom && !!form.dateTo && form.dateTo < form.dateFrom;

  function submit() {
    setError(null);
    if (dateRangeInvalid) {
      setError(t("dateRangeError"));
      return;
    }
    startTransition(async () => {
      const payload: TaskInput = {
        executorType: form.executorType,
        brigadeId: form.executorType === "BRIGADE" ? form.brigadeId : null,
        outsourceName: form.executorType === "OUTSOURCE" ? form.outsourceName : null,
        clientId: form.clientId,
        machineId: form.machineId || null,
        city: form.city,
        oblast: form.oblast,
        invoiceNumber: form.invoiceNumber || null,
        orderNumber: form.orderNumber || null,
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

  const executorFilled =
    form.executorType === "BRIGADE" ? !!form.brigadeId : !!form.outsourceName.trim();

  return (
    <div className="max-w-2xl space-y-4">
      {/* Виконавець: бригада або аутсорс */}
      <div>
        <span className="mb-1 block text-sm text-neutral-600">{t("fields.executor")}</span>
        <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 text-sm font-semibold">
          {(["BRIGADE", "OUTSOURCE"] as const).map((et) => (
            <button
              key={et}
              type="button"
              onClick={() => set("executorType", et)}
              className={
                "rounded-md px-3 py-1.5 transition " +
                (form.executorType === et
                  ? "bg-brand text-white"
                  : "text-neutral-500 hover:text-neutral-800")
              }
            >
              {t(`executor.${et}` as any)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {form.executorType === "BRIGADE" ? (
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
        ) : (
          <Field label={t("fields.outsourceName")}>
            <input
              className={inputCls}
              value={form.outsourceName}
              onChange={(e) => set("outsourceName", e.target.value)}
            />
          </Field>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-neutral-600">{t("fields.client")}</span>
            {isAdmin && (
              <button
                type="button"
                className="text-xs font-semibold text-brand-dark hover:underline"
                onClick={() => setShowQuickClient((v) => !v)}
              >
                {showQuickClient ? tc("cancel") : `+ ${tcl("new")}`}
              </button>
            )}
          </div>
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
        </div>
      </div>

      {showQuickClient && (
        <div className="space-y-3 rounded-lg border border-brand/30 bg-brand/5 p-3">
          <p className="text-sm font-semibold text-brand-dark">{tcl("new")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tcl("fields.name")}>
              <input className={inputCls} value={qc.name} onChange={(e) => setQc({ ...qc, name: e.target.value })} />
            </Field>
            <Field label={tcl("fields.edrpou")}>
              <input className={inputCls} value={qc.edrpou} onChange={(e) => setQc({ ...qc, edrpou: e.target.value })} />
            </Field>
            <Field label={tcl("fields.city")}>
              <input className={inputCls} value={qc.city} onChange={(e) => setQc({ ...qc, city: e.target.value })} />
            </Field>
            <Field label={tcl("fields.oblast")}>
              <OblastSelect value={qc.oblast} onChange={(v) => setQc({ ...qc, oblast: v })} />
            </Field>
          </div>
          <Field label={tcl("fields.contacts")}>
            <input className={inputCls} value={qc.contacts} onChange={(e) => setQc({ ...qc, contacts: e.target.value })} />
          </Field>
          <button
            type="button"
            className={btnPrimary}
            disabled={qcPending || !qc.name.trim() || !qc.city.trim() || !qc.oblast}
            onClick={quickAddClient}
          >
            {qcPending ? tc("saving") : tc("add")}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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
            value={form.invoiceNumber}
            onChange={(e) => set("invoiceNumber", e.target.value)}
          />
        </Field>
        <Field label={t("fields.orderNumber")}>
          <input
            className={inputCls}
            value={form.orderNumber}
            onChange={(e) => set("orderNumber", e.target.value)}
          />
        </Field>
        <Field label={t("fields.city")}>
          <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label={t("fields.oblast")}>
          <OblastSelect value={form.oblast} onChange={(v) => set("oblast", v)} />
        </Field>
        <Field label={t("fields.dateFrom")}>
          <input type="date" className={inputCls} value={form.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
        </Field>
        <Field label={t("fields.dateTo")}>
          <input type="date" className={inputCls} value={form.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
        </Field>
      </div>

      <Field label={t("fields.note")}>
        <textarea
          className={inputCls}
          rows={3}
          value={form.note}
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
                value={form.failureReason}
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
            !executorFilled ||
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
