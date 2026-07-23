"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { inputCls } from "@/components/ui/Field";

type Item = {
  id: string;
  machineName: string;
  equipmentType: string;
  fileName: string;
  size: number;
  price: string | null;
  currency: string | null;
  warnings: string[];
  byUserName: string | null;
  createdAt: string;
};

const TYPES = ["", "LASER", "CNC", "UNIVERSAL", "OTHER"];

const BADGE: Record<string, string> = {
  LASER: "bg-brand-orange/15 text-brand-orange",
  CNC: "bg-brand/15 text-brand-dark",
  UNIVERSAL: "bg-sky-100 text-sky-700",
  OTHER: "bg-neutral-200 text-neutral-600",
};

export default function KpLibrary({ version, active }: { version: number; active: boolean }) {
  const t = useTranslations("kp");
  const locale = useLocale();
  const [items, setItems] = useState<Item[] | null>(null);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!active && items !== null) return; // не перезавантажуємо у фоні
    let cancelled = false;
    setError(false);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (q.trim()) params.set("q", q.trim());
    const timer = setTimeout(() => {
      fetch(`/api/kp/documents?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          if (!cancelled) setItems(d.items);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    }, q ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, q, version, active]);

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/kp/documents/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  }

  const th = "px-3 py-2 text-left text-xs uppercase tracking-wide text-neutral-500";
  const td = "px-3 py-2 align-middle";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className={inputCls + " w-auto"} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((x) => (
            <option key={x} value={x}>
              {x ? t(`type_${x}` as never) : t("allTypes")}
            </option>
          ))}
        </select>
        <input
          className={inputCls + " w-64"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPh")}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-neutral-200">
            <tr>
              <th className={th}>{t("colName")}</th>
              <th className={th}>{t("colType")}</th>
              <th className={th}>{t("colDate")}</th>
              <th className={th}>{t("colAuthor")}</th>
              <th className={th}>{t("colSize")}</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {items === null && !error && (
              <tr>
                <td className={td + " py-6 text-center text-neutral-400"} colSpan={6}>
                  {t("loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td className={td + " py-6 text-center text-red-600"} colSpan={6}>
                  {t("errGeneric")}
                </td>
              </tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td className={td + " py-6 text-center text-neutral-400"} colSpan={6}>
                  {t("empty")}
                </td>
              </tr>
            )}
            {items?.map((d) => (
              <tr key={d.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className={td}>
                  <p className="font-medium text-neutral-800">{d.machineName}</p>
                  <p className="text-xs text-neutral-400">{d.fileName}</p>
                  {d.warnings.length > 0 && (
                    <p className="text-xs text-amber-700" title={d.warnings.join("\n")}>
                      ⚠ {t("hasWarnings", { count: d.warnings.length })}
                    </p>
                  )}
                </td>
                <td className={td}>
                  <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (BADGE[d.equipmentType] ?? BADGE.OTHER)}>
                    {t(`type_${d.equipmentType}` as never)}
                  </span>
                </td>
                <td className={td + " whitespace-nowrap text-neutral-600"}>
                  {new Date(d.createdAt).toLocaleString(locale === "ru" ? "ru-UA" : "uk-UA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className={td + " text-neutral-600"}>{d.byUserName ?? "—"}</td>
                <td className={td + " whitespace-nowrap text-neutral-500"}>{(d.size / 1024).toFixed(0)} КБ</td>
                <td className={td + " whitespace-nowrap text-right"}>
                  <a
                    href={`/api/kp/documents/${d.id}/download`}
                    className="mr-2 inline-block rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand/10"
                  >
                    {t("download")}
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 transition hover:border-red-300 hover:text-red-600"
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
