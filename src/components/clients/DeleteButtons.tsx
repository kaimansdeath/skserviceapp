"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { deleteMachine, deleteClient } from "@/app/actions/clients";

export function DeleteMachineButton({ machineId }: { machineId: string }) {
  const t = useTranslations("machines");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="text-neutral-400 transition hover:text-red-600 disabled:opacity-40"
      disabled={pending}
      title={t("delete")}
      onClick={() => {
        if (!window.confirm(t("deleteConfirm"))) return;
        startTransition(async () => {
          const res = await deleteMachine(machineId);
          if ("error" in res) window.alert(t("hasTasksHint"));
          router.refresh();
        });
      }}
    >
      ✕
    </button>
  );
}

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const t = useTranslations("clients");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="text-neutral-400 transition hover:text-red-600 disabled:opacity-40"
      disabled={pending}
      title={t("delete")}
      onClick={() => {
        if (!window.confirm(t("deleteConfirm"))) return;
        startTransition(async () => {
          const res = await deleteClient(clientId);
          if ("error" in res) {
            window.alert(t("hasTasksHint"));
          } else {
            router.push(`/${locale}/clients`);
          }
          router.refresh();
        });
      }}
    >
      ✕
    </button>
  );
}
