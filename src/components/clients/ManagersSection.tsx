"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addManager, deleteManager } from "@/app/actions/clients";
import { inputCls, btnPrimary } from "@/components/ui/Field";

type Manager = { id: string; name: string; clientsCount: number };

export default function ManagersSection({ managers }: { managers: Manager[] }) {
  const t = useTranslations("clients.managers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="block flex-1">
          <span className="mb-1 block text-xs text-neutral-500">{t("name")}</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button
          className={btnPrimary}
          disabled={pending || !name.trim()}
          onClick={() =>
            startTransition(async () => {
              await addManager(name);
              setName("");
              router.refresh();
            })
          }
        >
          {tc("add")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2 text-right">{t("clientsCount")}</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => (
              <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2 font-medium">{m.name}</td>
                <td className="px-3 py-2 text-right">{m.clientsCount}</td>
                <td className="px-3 py-2">
                  <button
                    className="text-neutral-400 transition hover:text-red-600 disabled:opacity-40"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(t("deleteConfirm", { name: m.name }))) return;
                      startTransition(async () => {
                        await deleteManager(m.id);
                        router.refresh();
                      });
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
