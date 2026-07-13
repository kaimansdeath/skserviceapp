"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { setToolStatus, moveTool, deleteTool } from "@/app/actions/tools";

export type ToolItem = {
  id: string;
  name: string;
  inventoryNumber: string | null;
  toolClass: string;
  status: string;
  holderLabel: string;
  holderKey: string; // "w" | "b:<id>" | "p:<id>"
};

const STATUS_CLS: Record<string, string> = {
  WORKING: "bg-brand/10 text-brand-dark",
  BROKEN: "bg-amber-100 text-amber-800",
  LOST: "bg-red-100 text-red-700",
};

export default function ToolRow({
  tool,
  brigades,
  people,
  canManage,
  canDelete,
}: {
  tool: ToolItem;
  brigades: { id: string; name: string }[];
  people: { id: string; name: string }[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("tools");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="px-3 py-2">
        <Link href={`/tools/${tool.id}`} className="font-medium text-brand-dark hover:underline">
          {tool.name}
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
        {tool.inventoryNumber ?? "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
        {t(`class.${tool.toolClass}` as any)}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        {canManage ? (
          <select
            className={
              "cursor-pointer rounded-full border-0 py-0.5 pl-2.5 pr-6 text-xs font-semibold outline-none disabled:opacity-50 " +
              (STATUS_CLS[tool.status] ?? "bg-neutral-200")
            }
            value={tool.status}
            disabled={pending}
            onChange={(e) =>
              startTransition(async () => {
                await setToolStatus(tool.id, e.target.value as any);
                router.refresh();
              })
            }
          >
            {["WORKING", "BROKEN", "LOST"].map((s) => (
              <option key={s} value={s} className="bg-white font-normal text-neutral-800">
                {t(`status.${s}` as any)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={
              "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
              (STATUS_CLS[tool.status] ?? "bg-neutral-200")
            }
          >
            {t(`status.${tool.status}` as any)}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        {canManage ? (
          <select
            className="w-44 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-brand disabled:opacity-50"
            value={tool.holderKey}
            disabled={pending}
            onChange={(e) => {
              const v = e.target.value;
              const target =
                v === "w"
                  ? ({ type: "WAREHOUSE" } as const)
                  : v.startsWith("b:")
                    ? ({ type: "BRIGADE", id: v.slice(2) } as const)
                    : ({ type: "PERSON", id: v.slice(2) } as const);
              startTransition(async () => {
                await moveTool(tool.id, target);
                router.refresh();
              });
            }}
          >
            <option value="w">🏭 {t("warehouse")}</option>
            <optgroup label={t("tabs.brigades")}>
              {brigades.map((b) => (
                <option key={b.id} value={`b:${b.id}`}>{b.name}</option>
              ))}
            </optgroup>
            <optgroup label={t("tabs.people")}>
              {people.map((p) => (
                <option key={p.id} value={`p:${p.id}`}>{p.name}</option>
              ))}
            </optgroup>
          </select>
        ) : (
          <span className="text-neutral-700">{tool.holderLabel}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {canDelete && (
          <button
            className="text-neutral-300 transition hover:text-red-600 disabled:opacity-40"
            title={t("delete")}
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("deleteConfirm", { name: tool.name }))) return;
              startTransition(async () => {
                await deleteTool(tool.id);
                router.refresh();
              });
            }}
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  );
}
