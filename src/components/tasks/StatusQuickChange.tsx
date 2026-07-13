"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { changeTaskStatus } from "@/app/actions/tasks";
import {
  nextStatusesFor,
  REASON_STATUSES,
  STATUS_BADGE,
  type TaskStatusValue,
} from "@/lib/taskStatus";

/** Швидка зміна статусу прямо зі списку задач */
export default function StatusQuickChange({
  taskId,
  current,
  role,
}: {
  taskId: string;
  current: TaskStatusValue;
  role: string;
}) {
  const ts = useTranslations("status");
  const t = useTranslations("tasks");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const options = nextStatusesFor(role, current);

  function onChange(to: TaskStatusValue) {
    let reason: string | undefined;
    if (REASON_STATUSES.includes(to)) {
      const input = window.prompt(
        to === "NOT_DONE" ? t("notDoneReasonPrompt") : t("partialReasonPrompt")
      );
      if (input === null) return; // скасовано
      if (!input.trim()) {
        window.alert(t("reasonRequired"));
        return;
      }
      reason = input.trim();
    } else if (to === "DONE") {
      const input = window.prompt(t("doneCommentPrompt"));
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    startTransition(async () => {
      await changeTaskStatus({ taskId, to, reason });
      router.refresh();
    });
  }

  return (
    <select
      className={
        "cursor-pointer appearance-none rounded-full border-0 py-0.5 pl-2.5 pr-6 text-xs font-semibold outline-none disabled:opacity-50 " +
        (STATUS_BADGE[current] ?? "bg-neutral-200")
      }
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
        backgroundSize: "10px",
      }}
      value={current}
      disabled={pending || options.length === 0}
      onChange={(e) => onChange(e.target.value as TaskStatusValue)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value={current}>{ts(current as any)}</option>
      {options.map((s) => (
        <option key={s} value={s} className="bg-white font-normal text-neutral-800">
          → {ts(s as any)}
        </option>
      ))}
    </select>
  );
}
