"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { deleteTask } from "@/app/actions/tasks";

export default function DeleteTaskButton({ taskId }: { taskId: string }) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("deleteConfirm"))) return;
        startTransition(async () => {
          const res = await deleteTask(taskId);
          if ("ok" in res) {
            router.push(`/${locale}/tasks`);
            router.refresh();
          }
        });
      }}
    >
      {t("delete")}
    </button>
  );
}
