"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createBrigade } from "@/app/actions/brigades";
import { inputCls, btnPrimary } from "@/components/ui/Field";

export default function BrigadeAddForm() {
  const t = useTranslations("brigades");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  return (
    <div className="flex items-end gap-3">
      <label className="block flex-1">
        <span className="mb-1 block text-xs text-neutral-500">{t("newBrigade")}</span>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button
        className={btnPrimary}
        disabled={pending || !name.trim()}
        onClick={() =>
          startTransition(async () => {
            await createBrigade(name);
            setName("");
            router.refresh();
          })
        }
      >
        {t("addBrigade")}
      </button>
    </div>
  );
}
