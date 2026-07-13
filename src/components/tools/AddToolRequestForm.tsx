"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addToolRequest } from "@/app/actions/tools";
import { inputCls, btnPrimary, btnSecondary } from "@/components/ui/Field";

export default function AddToolRequestForm() {
  const t = useTranslations("tools.requests");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"PURCHASE" | "ISSUE">("ISSUE");
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
        onClick={() => setOpen(true)}
      >
        + {t("addRequest")}
      </button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-end gap-3 rounded-xl border border-brand-orange/40 bg-orange-50/40 p-3">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("kind")}</span>
        <select
          className={inputCls + " w-52"}
          value={kind}
          onChange={(e) => setKind(e.target.value as any)}
        >
          <option value="ISSUE">{t("kindIssue")}</option>
          <option value="PURCHASE">{t("kindPurchase")}</option>
        </select>
      </label>
      <label className="block min-w-64 flex-1">
        <span className="mb-1 block text-xs text-neutral-500">{t("text")}</span>
        <input
          className={inputCls}
          placeholder={t("textPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <button
        className={btnPrimary}
        disabled={pending || !text.trim()}
        onClick={() =>
          startTransition(async () => {
            await addToolRequest(kind, text);
            setText("");
            setOpen(false);
            router.refresh();
          })
        }
      >
        {pending ? tc("saving") : tc("add")}
      </button>
      <button className={btnSecondary} onClick={() => setOpen(false)}>
        {tc("cancel")}
      </button>
    </div>
  );
}
