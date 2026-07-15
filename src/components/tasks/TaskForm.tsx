"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createTask, updateTask, checkOverlap, type TaskInput } from "@/app/actions/tasks";
import { saveClient, addInvoice, saveMachine } from "@/app/actions/clients";
import { ALL_STATUSES, TASK_TYPES, type TaskStatusValue } from "@/lib/taskStatus";
import { OBLASTS } from "@/lib/oblasts";
import { WARRANTY_OPTIONS } from "@/lib/warranty";
import MapPicker from "@/components/map/MapPickerDynamic";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

export type ClientOption = {
  id: string;
  name: string;
  city: string;
  oblast: string;
  machines: { id: string; label: string }[];
  invoices: { id: string; number: string }[];
};

type Initial = Partial<TaskInput> & {
  id?: string;
  requestId?: string;
  launchId?: string;
  machineIds?: string[];
  assigneeIds?: string[];
  status?: TaskStatusValue;
  failureReason?: string | null;
};

function OblastSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options: string[] = [...OBLASTS];
  if (value && !options.includes(value)) options.unshift(value);
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export type StaffOption = {
  id: string;
  name: string;
  role: string; // BRIGADE_LEADER | BRIGADE_MEMBER
  brigadeId: string | null;
  brigadeName: string | null;
};

export default function TaskForm({
  clients: clientsProp,
  staff,
  machineTypes,
  initial,
  isAdmin,
}: {
  clients: ClientOption[];
  staff: StaffOption[];
  machineTypes: { id: string; name: string }[];
  initial?: Initial;
  isAdmin: boolean;
}) {
  const t = useTranslations("tasks");
  const tcl = useTranslations("clients");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tt = useTranslations("taskType");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [clients, setClients] = useState<ClientOption[]>(clientsProp);
  const [form, setForm] = useState({
    taskType: (initial?.taskType ?? "OTHER") as (typeof TASK_TYPES)[number],
    executorType: (initial?.executorType ?? "BRIGADE") as "BRIGADE" | "OUTSOURCE",
    assigneeIds: (initial?.assigneeIds ?? []) as string[],
    outsourceName: initial?.outsourceName ?? "",
    clientId: initial?.clientId ?? "",
    machineIds: (initial?.machineIds ?? []) as string[],
    invoiceId: initial?.invoiceId ?? "",
    city: initial?.city ?? "",
    oblast: initial?.oblast ?? "",
    address: initial?.address ?? "",
    lat: (initial?.lat ?? null) as number | null,
    lng: (initial?.lng ?? null) as number | null,
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
  const [qc, setQc] = useState({ name: "", edrpou: "", city: "", oblast: "" });
  const [qcPending, startQcTransition] = useTransition();

  const [showMap, setShowMap] = useState(!!initial?.lat);

  // Пошук у списку клієнтів
  const [clientQuery, setClientQuery] = useState("");
  const filteredClients = clientQuery.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase()))
    : clients;

  // Швидке додавання верстата
  const [showQuickMachine, setShowQuickMachine] = useState(false);
  const [qm, setQm] = useState({ typeId: "", model: "", serialNumber: "", warrantyMonths: 12 });
  const [qmPending, startQmTransition] = useTransition();

  function quickAddMachine() {
    if (!form.clientId) return;
    startQmTransition(async () => {
      const res = await saveMachine(null, {
        clientId: form.clientId,
        typeId: qm.typeId,
        model: qm.model,
        serialNumber: qm.serialNumber || null,
        warrantyMonths: qm.warrantyMonths,
        note: null,
      });
      if ("error" in res) return;
      const label = `${qm.model.trim()}${qm.serialNumber.trim() ? ` (${qm.serialNumber.trim()})` : ""}`;
      setClients((list) =>
        list.map((c) =>
          c.id === form.clientId ? { ...c, machines: [...c.machines, { id: res.id, label }] } : c
        )
      );
      setForm((f) => ({ ...f, machineIds: [...f.machineIds, res.id] }));
      setShowQuickMachine(false);
      setQm({ typeId: "", model: "", serialNumber: "", warrantyMonths: 12 });
    });
  }

  // Швидке додавання рахунку
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState("");
  const [invPending, startInvTransition] = useTransition();

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
      machineIds: [],
      invoiceId: "",
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
        note: null,
      });
      if ("error" in res) return;
      const created: ClientOption = {
        id: res.id,
        name: qc.name.trim(),
        city: qc.city.trim(),
        oblast: qc.oblast,
        machines: [],
        invoices: [],
      };
      setClients((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({
        ...f,
        clientId: created.id,
        machineIds: [],
        invoiceId: "",
        city: created.city,
        oblast: created.oblast,
      }));
      setShowQuickClient(false);
      setQc({ name: "", edrpou: "", city: "", oblast: "" });
    });
  }

  function quickAddInvoice() {
    if (!form.clientId) return;
    startInvTransition(async () => {
      const res = await addInvoice(form.clientId, newInvoice);
      if ("error" in res) return;
      setClients((list) =>
        list.map((c) =>
          c.id === form.clientId && !c.invoices.some((i) => i.id === res.id)
            ? { ...c, invoices: [...c.invoices, { id: res.id, number: res.number }] }
            : c
        )
      );
      setForm((f) => ({ ...f, invoiceId: res.id }));
      setShowQuickInvoice(false);
      setNewInvoice("");
    });
  }

  // Перевірка перетину дат для бригад обраних людей — попередження, не блокування
  const selectedBrigadeIds = Array.from(
    new Set(
      staff
        .filter((p) => form.assigneeIds.includes(p.id) && p.brigadeId)
        .map((p) => p.brigadeId as string)
    )
  );
  useEffect(() => {
    let cancelled = false;
    const brigadeIds = selectedBrigadeIds;
    if (
      form.executorType === "BRIGADE" &&
      brigadeIds.length > 0 &&
      form.dateFrom &&
      form.dateTo &&
      form.dateTo >= form.dateFrom
    ) {
      Promise.all(
        brigadeIds.map((bid) =>
          checkOverlap({
            brigadeId: bid,
            dateFrom: form.dateFrom,
            dateTo: form.dateTo,
            excludeTaskId: initial?.id,
          })
        )
      ).then((results) => {
        if (cancelled) return;
        const merged = results.flat();
        const unique = merged.filter((o, i) => merged.findIndex((x) => x.id === o.id) === i);
        setOverlaps(unique);
      });
    } else {
      setOverlaps([]);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.executorType, selectedBrigadeIds.join(","), form.dateFrom, form.dateTo, initial?.id]);

  const dateRangeInvalid = !!form.dateFrom && !!form.dateTo && form.dateTo < form.dateFrom;

  function submit() {
    setError(null);
    if (dateRangeInvalid) {
      setError(t("dateRangeError"));
      return;
    }
    startTransition(async () => {
      const payload: TaskInput = {
        requestId: initial?.requestId,
        launchId: initial?.launchId,
        taskType: form.taskType,
        executorType: form.executorType,
        assigneeIds: form.executorType === "BRIGADE" ? form.assigneeIds : [],
        outsourceName: form.executorType === "OUTSOURCE" ? form.outsourceName : null,
        clientId: form.clientId,
        machineIds: form.machineIds,
        invoiceId: form.invoiceId || null,
        city: form.city,
        oblast: form.oblast,
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

  const hasLeader = staff.some(
    (p) => form.assigneeIds.includes(p.id) && ["BRIGADE_LEADER", "ADMIN"].includes(p.role)
  );
  const executorFilled =
    form.executorType === "BRIGADE" ? hasLeader : !!form.outsourceName.trim();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.taskType")}>
          <select
            className={inputCls}
            value={form.taskType}
            onChange={(e) => set("taskType", e.target.value as any)}
          >
            {TASK_TYPES.map((tp) => (
              <option key={tp} value={tp}>{tt(tp as any)}</option>
            ))}
          </select>
        </Field>
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
      </div>

      {form.executorType === "BRIGADE" ? (
        <div>
          <span className="mb-1 block text-sm text-neutral-600">{t("fields.assignees")}</span>
          <div className="space-y-2 rounded-lg border border-neutral-300 bg-white p-3">
            {Array.from(
              staff.reduce((acc, p) => {
                const key = p.brigadeId ?? "—";
                if (!acc.has(key)) acc.set(key, { name: p.brigadeName ?? "—", people: [] as StaffOption[] });
                acc.get(key)!.people.push(p);
                return acc;
              }, new Map<string, { name: string; people: StaffOption[] }>())
            ).map(([bid, group]) => {
              const groupIds = group.people.map((p) => p.id);
              const allSelected = groupIds.every((id) => form.assigneeIds.includes(id));
              return (
                <div key={bid} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "assigneeIds",
                        allSelected
                          ? form.assigneeIds.filter((id) => !groupIds.includes(id))
                          : Array.from(new Set([...form.assigneeIds, ...groupIds]))
                      )
                    }
                    className={
                      "rounded-md px-2 py-1 text-xs font-semibold transition " +
                      (allSelected
                        ? "bg-brand text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")
                    }
                  >
                    {group.name}
                  </button>
                  {group.people.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#009C4B]"
                        checked={form.assigneeIds.includes(p.id)}
                        onChange={(e) =>
                          set(
                            "assigneeIds",
                            e.target.checked
                              ? [...form.assigneeIds, p.id]
                              : form.assigneeIds.filter((id) => id !== p.id)
                          )
                        }
                      />
                      <span className={["BRIGADE_LEADER", "ADMIN"].includes(p.role) ? "font-semibold" : ""}>
                        {p.name}
                      </span>
                      {p.role === "BRIGADE_LEADER" && (
                        <span className="text-xs text-neutral-400">{t("fields.leaderTag")}</span>
                      )}
                      {p.role === "ADMIN" && (
                        <span className="text-xs text-neutral-400">{t("fields.adminTag")}</span>
                      )}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          {form.assigneeIds.length > 0 && !hasLeader && (
            <p className="mt-1 text-xs font-medium text-brand-orange">{t("fields.leaderRequired")}</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.outsourceName")}>
            <input
              className={inputCls}
              value={form.outsourceName}
              onChange={(e) => set("outsourceName", e.target.value)}
            />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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
          <input
            className={inputCls + " mb-1.5"}
            placeholder={t("fields.clientSearch")}
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
          />
          <select
            className={inputCls}
            value={form.clientId}
            onChange={(e) => onClientChange(e.target.value)}
          >
            <option value="" disabled>—</option>
            {selectedClient && !filteredClients.some((c) => c.id === selectedClient.id) && (
              <option value={selectedClient.id}>{selectedClient.name}</option>
            )}
            {filteredClients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-neutral-600">{t("fields.machines")}</span>
            {isAdmin && form.clientId && (
              <button
                type="button"
                className="text-xs font-semibold text-brand-dark hover:underline"
                onClick={() => setShowQuickMachine((v) => !v)}
              >
                {showQuickMachine ? tc("cancel") : `+ ${t("fields.addMachine")}`}
              </button>
            )}
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-neutral-300 bg-white p-2">
            {!selectedClient || selectedClient.machines.length === 0 ? (
              <p className="px-1 py-1 text-sm text-neutral-400">{t("fields.noMachine")}</p>
            ) : (
              selectedClient.machines.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#009C4B]"
                    checked={form.machineIds.includes(m.id)}
                    onChange={(e) =>
                      set(
                        "machineIds",
                        e.target.checked
                          ? [...form.machineIds, m.id]
                          : form.machineIds.filter((id) => id !== m.id)
                      )
                    }
                  />
                  <span>{m.label}</span>
                </label>
              ))
            )}
          </div>
          {showQuickMachine && (
            <div className="mt-2 space-y-2 rounded-lg border border-brand/30 bg-brand/5 p-3">
              <select
                className={inputCls}
                value={qm.typeId}
                onChange={(e) => setQm({ ...qm, typeId: e.target.value })}
              >
                <option value="" disabled>{t("fields.machineType")}</option>
                {machineTypes.map((tp) => (
                  <option key={tp.id} value={tp.id}>{tp.name}</option>
                ))}
              </select>
              <input
                className={inputCls}
                placeholder={t("fields.machineModel")}
                value={qm.model}
                onChange={(e) => setQm({ ...qm, model: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder={t("fields.machineSerial")}
                value={qm.serialNumber}
                onChange={(e) => setQm({ ...qm, serialNumber: e.target.value })}
              />
              <select
                className={inputCls}
                value={qm.warrantyMonths}
                onChange={(e) => setQm({ ...qm, warrantyMonths: Number(e.target.value) })}
              >
                {WARRANTY_OPTIONS.map((m) => (
                  <option key={m} value={m}>{t("fields.machineWarranty", { months: m })}</option>
                ))}
              </select>
              <button
                type="button"
                className={btnPrimary}
                disabled={qmPending || !qm.typeId || !qm.model.trim()}
                onClick={quickAddMachine}
              >
                {qmPending ? tc("saving") : tc("add")}
              </button>
            </div>
          )}
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
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-neutral-600">{t("fields.invoice")}</span>
            {isAdmin && form.clientId && (
              <button
                type="button"
                className="text-xs font-semibold text-brand-dark hover:underline"
                onClick={() => setShowQuickInvoice((v) => !v)}
              >
                {showQuickInvoice ? tc("cancel") : `+ ${t("fields.newInvoice")}`}
              </button>
            )}
          </div>
          <select
            className={inputCls}
            value={form.invoiceId}
            onChange={(e) => set("invoiceId", e.target.value)}
            disabled={!selectedClient}
          >
            <option value="">{t("fields.noInvoice")}</option>
            {selectedClient?.invoices.map((i) => (
              <option key={i.id} value={i.id}>{i.number}</option>
            ))}
          </select>
          {showQuickInvoice && (
            <div className="mt-2 flex gap-2">
              <input
                className={inputCls}
                placeholder="СФ-2026-…"
                value={newInvoice}
                onChange={(e) => setNewInvoice(e.target.value)}
              />
              <button
                type="button"
                className={btnPrimary}
                disabled={invPending || !newInvoice.trim()}
                onClick={quickAddInvoice}
              >
                {invPending ? "…" : tc("add")}
              </button>
            </div>
          )}
        </div>
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
        <Field label={t("fields.address")}>
          <input
            className={inputCls}
            placeholder={t("fields.addressPlaceholder")}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <div className="flex items-end pb-1">
          <button
            type="button"
            className="text-sm font-semibold text-brand-dark hover:underline"
            onClick={() => setShowMap((v) => !v)}
          >
            {showMap ? t("fields.hideMap") : t("fields.showOnMap")}
            {form.lat != null && " 📍"}
          </button>
        </div>
        <Field label={t("fields.dateFrom")}>
          <input type="date" className={inputCls} value={form.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
        </Field>
        <Field label={t("fields.dateTo")}>
          <input type="date" className={inputCls} value={form.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
        </Field>
      </div>

      {showMap && (
        <div>
          <p className="mb-1 text-xs text-neutral-500">{t("fields.mapHint")}</p>
          <MapPicker
            value={form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null}
            onChange={(v) => {
              set("lat", v?.lat ?? null);
              set("lng", v?.lng ?? null);
            }}
          />
          {form.lat != null && (
            <button
              type="button"
              className="mt-1 text-xs text-neutral-400 hover:text-red-600"
              onClick={() => {
                set("lat", null);
                set("lng", null);
              }}
            >
              ✕ {t("fields.clearPoint")}
            </button>
          )}
        </div>
      )}

      <Field label={t("fields.note")}>
        <textarea className={inputCls} rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} />
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
          {["NOT_DONE", "PARTIALLY_DONE"].includes(form.status ?? "") && (
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

      {dateRangeInvalid && <p className="text-sm font-medium text-red-600">{t("dateRangeError")}</p>}

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
