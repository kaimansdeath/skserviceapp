"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { distributeTool } from "@/app/actions/tools";
import { btnPrimary, btnSecondary } from "@/components/ui/Field";

export type AllocMap = { w: number; [key: string]: number };

export default function DistributeTool({
  toolId,
  totalQuantity,
  current, // { w: number, "b:<id>": number, "p:<id>": number }
  brigades,
  people,
}: {
  toolId: string;
  totalQuantity: number;
  current: Record<string, number>;
  brigades: { id: string; name: string }[];
  people: { id: string; name: string }[];
}) {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Record<string, number>>(current);
  const [error, setError] = useState<string | null>(null);

  const activeKeys = Object.keys(rows).filter((k) => rows[k] > 0);
  const total = Object.values(rows).reduce((s, v) => s + (v || 0), 0);
  const remaining = totalQuantity - total;

  function setQty(key: string, v: number) {
    setRows((r) => ({ ...r, [key]: Math.max(0, v) }));
  }

  function addRow(key: string) {
    if (rows[key] !== undefined) return;
    setRows((r) => ({ ...r, [key]: 0 }));
  }

  if (!open) {
    return (
      <button
        className="text-xs font-semibold text-brand-dark hover:underline"
        onClick={() => {
          setRows(current);
          setOpen(true);
        }}
      >
        {t("distribute")}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-brand/30 bg-brand/5 p-3">
      <p className="text-xs font-medium text-neutral-600">
        {t("distributeHint", { total: totalQuantity })}
      </p>
      <div className="space-y-1.5">
        {Object.keys(rows).map((key) => {
          const label =
            key === "w"
              ? `🏭 ${t("warehouse")}`
              : key.startsWith("b:")
                ? brigades.find((b) => b.id === key.slice(2))?.name ?? "?"
                : people.find((p) => p.id === key.slice(2))?.name ?? "?";
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-40 truncate text-sm">{label}</span>
              <input
                type="number"
                min={0}
                className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-brand"
                value={rows[key]}
                onChange={(e) => setQty(key, parseInt(e.target.value || "0", 10))}
              />
              {key !== "w" && (
                <button
                  className="text-neutral-300 hover:text-red-600"
                  onClick={() =>
                    setRows((r) => {
                      const next = { ...r };
                      delete next[key];
                      return next;
                    })
                  }
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-brand/20 pt-2">
        <select
          className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          onChange={(e) => {
            if (e.target.value) addRow(e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
        >
          <option value="" disabled>+ {t("tabs.brigades")}</option>
          {brigades
            .filter((b) => rows[`b:${b.id}`] === undefined)
            .map((b) => (
              <option key={b.id} value={`b:${b.id}`}>{b.name}</option>
            ))}
        </select>
        <select
          className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          onChange={(e) => {
            if (e.target.value) addRow(e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
        >
          <option value="" disabled>+ {t("tabs.people")}</option>
          {people
            .filter((p) => rows[`p:${p.id}`] === undefined)
            .map((p) => (
              <option key={p.id} value={`p:${p.id}`}>{p.name}</option>
            ))}
        </select>
      </div>

      <p className={"text-xs font-semibold " + (remaining === 0 ? "text-brand-dark" : "text-red-600")}>
        {t("remaining", { count: remaining })}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          className={btnPrimary}
          disabled={pending || remaining !== 0}
          onClick={() =>
            startTransition(async () => {
              const res = await distributeTool(
                toolId,
                Object.entries(rows).map(([key, quantity]) => ({ key, quantity }))
              );
              if ("error" in res) {
                setError(t("distributeError"));
                return;
              }
              setOpen(false);
              router.refresh();
            })
          }
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <button className={btnSecondary} onClick={() => setOpen(false)}>
          {tc("cancel")}
        </button>
      </div>
    </div>
  );
}
