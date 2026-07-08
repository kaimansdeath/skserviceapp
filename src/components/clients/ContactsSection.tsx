"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addClientContact, deleteClientContact } from "@/app/actions/clients";
import { inputCls, btnPrimary } from "@/components/ui/Field";

type Contact = { id: string; position: string | null; fullName: string; phone: string | null };

export default function ContactsSection({
  clientId,
  contacts,
  canEdit,
}: {
  clientId: string;
  contacts: Contact[];
  canEdit: boolean;
}) {
  const t = useTranslations("clients.contacts");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ position: "", fullName: "", phone: "" });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("title")}</h2>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("position")}</th>
              <th className="px-3 py-2">{t("fullName")}</th>
              <th className="px-3 py-2">{t("phone")}</th>
              {canEdit && <th className="w-10 px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-3 py-4 text-center text-neutral-400">
                  {t("empty")}
                </td>
              </tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2 text-neutral-500">{c.position ?? "—"}</td>
                <td className="px-3 py-2 font-medium">{c.fullName}</td>
                <td className="px-3 py-2">
                  {c.phone ? (
                    <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-brand-dark hover:underline">
                      {c.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <button
                      className="text-neutral-400 transition hover:text-red-600"
                      title={tc("actions")}
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteClientContact(c.id);
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
      {canEdit && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t("position")}</span>
            <input className={inputCls + " w-48"} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t("fullName")}</span>
            <input className={inputCls + " w-56"} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t("phone")}</span>
            <input className={inputCls + " w-44"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <button
            className={btnPrimary}
            disabled={pending || !form.fullName.trim()}
            onClick={() =>
              startTransition(async () => {
                await addClientContact({ clientId, ...form });
                setForm({ position: "", fullName: "", phone: "" });
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
