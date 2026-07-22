"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { changeTaskStatus } from "@/app/actions/tasks";
import { nextStatusesFor, REASON_STATUSES, FINAL_STATUSES, type TaskStatusValue } from "@/lib/taskStatus";
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
  const [askReason, setAskReason] = useState<TaskStatusValue | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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
      // фото/відео звіту — на Volume після успішної зміни статусу
      if (files.length > 0) {
        const fd = new FormData();
        for (const f of files) fd.append("files", f);
        await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd }).catch(
          () => {}
        );
      }
      setAskReason(null);
      setReason("");
      setFiles([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-neutral-700">{t("changeStatus")}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((s) =>
          FINAL_STATUSES.includes(s) ? (
            <button
              key={s}
              className={
                s === "NOT_DONE"
                  ? "rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  : s === "PARTIALLY_DONE"
                    ? "rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                    : "rounded-lg border border-brand bg-white px-4 py-2 text-sm font-medium text-brand-dark transition hover:bg-brand/5"
              }
              disabled={pending}
              onClick={() => setAskReason(s)}
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
        <div className="max-w-md space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-700">
            {askReason === "NOT_DONE"
              ? t("notDoneReasonPrompt")
              : askReason === "PARTIALLY_DONE"
                ? t("partialReasonPrompt")
                : t("doneCommentPrompt")}
          </p>
          <textarea
            className={inputCls}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onPaste={(e) => {
              // вставка скріншота/фото з буфера обміну одразу до звіту
              const pasted = Array.from(e.clipboardData.files).filter(
                (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
              );
              if (pasted.length > 0) {
                e.preventDefault();
                setFiles((prev) => [...prev, ...pasted]);
              }
            }}
          />
          <div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                if (list.length) setFiles((prev) => [...prev, ...list]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="text-sm font-semibold text-brand-dark hover:underline"
              onClick={() => fileRef.current?.click()}
            >
              📎 {t("attachMedia")}
            </button>
            {files.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="truncate">{f.name}</span>
                    <span className="text-neutral-400">
                      {(f.size / 1024 / 1024).toFixed(1)} МБ
                    </span>
                    <button
                      type="button"
                      className="text-neutral-300 hover:text-red-600"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className={btnPrimary}
              disabled={pending || (REASON_STATUSES.includes(askReason) && !reason.trim())}
              onClick={() => apply(askReason, reason)}
            >
              {tc("save")}
            </button>
            <button className={btnSecondary} onClick={() => setAskReason(null)}>
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
