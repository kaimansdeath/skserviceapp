"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addInvoice, deleteInvoice } from "@/app/actions/clients";
import { inputCls, btnPrimary } from "@/components/ui/Field";

type Invoice = { id: string; number: string; tasksCount: number };

export default function InvoicesSection({
  clientId,
  invoices,
  canEdit,
}: {
  clientId: string;
  invoices: Invoice[];
  canEdit: boolean;
}) {
  const t = useTranslations("clients.invoices");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("title")}</h2>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("number")}</th>
              <th className="px-3 py-2 text-right">{t("tasksCount")}</th>
              {canEdit && <th className="w-10 px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 3 : 2} className="px-3 py-4 text-center text-neutral-400">
                  {t("empty")}
                </td>
              </tr>
            )}
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2 font-medium">{i.number}</td>
                <td className="px-3 py-2 text-right">{i.tasksCount}</td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <button
                      className="text-neutral-400 transition hover:text-red-600 disabled:opacity-40"
                      disabled={pending || i.tasksCount > 0}
                      title={i.tasksCount > 0 ? t("hasTasksHint") : undefined}
                      onClick={() =>
                        startTransition(async () => {
                          setError(null);
                          const res = await deleteInvoice(i.id);
                          if ("error" in res) setError(t("hasTasksHint"));
                          router.refresh();
                        })
                      }
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-sm text-brand-orange">{error}</p>}
      {canEdit && (
        <div className="mt-3 flex items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t("number")}</span>
            <input
              className={inputCls + " w-56"}
              placeholder="СФ-2026-…"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>
          <button
            className={btnPrimary}
            disabled={pending || !number.trim()}
            onClick={() =>
              startTransition(async () => {
                await addInvoice(clientId, number);
                setNumber("");
                router.refresh();
              })
            }
          >
            {tc("add")}
          </button>
        </div>
      )}
    </section>
  );
}
