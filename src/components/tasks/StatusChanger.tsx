"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { changeTaskStatus } from "@/app/actions/tasks";
import { nextStatusesFor, type TaskStatusValue } from "@/lib/taskStatus";
import { btnSecondary, inputCls, btnPrimary } from "@/components/ui/Field";

export default function StatusChanger({
  taskId,
  current,
  role,
}: {
  taskId: string;
  current: TaskStatusValue;
  role: string;
}) {
  const t = useTranslations("tasks");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [askReason, setAskReason] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const options = nextStatusesFor(role, current);
  if (options.length === 0) return null;

  function apply(to: TaskStatusValue, reasonText?: string) {
    setError(null);
    startTransition(async () => {
      const res = await changeTaskStatus({ taskId, to, reason: reasonText });
      if ("error" in res) {
        setError(res.error === "REASON_REQUIRED" ? t("reasonRequired") : tc("error"));
        return;
      }
      setAskReason(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-neutral-700">{t("changeStatus")}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((s) =>
          s === "NOT_DONE" ? (
            <button
              key={s}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              disabled={pending}
              onClick={() => setAskReason(true)}
            >
              {ts(s as any)}
            </button>
          ) : (
            <button
              key={s}
              className={btnSecondary}
              disabled={pending}
              onClick={() => apply(s)}
            >
              {ts(s as any)}
            </button>
          )
        )}
      </div>
      {askReason && (
        <div className="max-w-md space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">{t("notDoneReasonPrompt")}</p>
          <textarea
            className={inputCls}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className={btnPrimary}
              disabled={pending || !reason.trim()}
              onClick={() => apply("NOT_DONE", reason)}
            >
              {tc("save")}
            </button>
            <button className={btnSecondary} onClick={() => setAskReason(false)}>
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
