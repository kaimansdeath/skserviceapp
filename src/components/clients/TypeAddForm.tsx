"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addMachineType } from "@/app/actions/clients";
import { inputCls, btnPrimary } from "@/components/ui/Field";

export default function TypeAddForm() {
  const t = useTranslations("clients.types");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nameUk, setNameUk] = useState("");
  const [nameRu, setNameRu] = useState("");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("nameUk")}</span>
        <input className={inputCls + " w-64"} value={nameUk} onChange={(e) => setNameUk(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t("nameRu")}</span>
        <input className={inputCls + " w-64"} value={nameRu} onChange={(e) => setNameRu(e.target.value)} />
      </label>
      <button
        className={btnPrimary}
        disabled={pending || !nameUk.trim() || !nameRu.trim()}
        onClick={() =>
          startTransition(async () => {
            await addMachineType(nameUk, nameRu);
            setNameUk("");
            setNameRu("");
            router.refresh();
          })
        }
      >
        {pending ? tc("saving") : t("add")}
      </button>
    </div>
  );
}
