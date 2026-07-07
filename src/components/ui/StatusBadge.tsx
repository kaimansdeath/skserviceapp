import { useTranslations } from "next-intl";
import { STATUS_BADGE, type TaskStatusValue } from "@/lib/taskStatus";

export default function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");
  return (
    <span
      className={
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold " +
        (STATUS_BADGE[status as TaskStatusValue] ?? "bg-neutral-200")
      }
    >
      {t(status as any)}
    </span>
  );
}
