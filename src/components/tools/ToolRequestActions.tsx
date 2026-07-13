"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { resolveToolRequest, approveToolRequest } from "@/app/actions/tools";

/**
 * Кнопки заявки:
 * закупка NEW → керівник: Виконано / Відхилити;
 * видача NEW → керівник: Погодити / Відхилити;
 * видача APPROVED → комірник або керівник: Видано / Відхилити.
 */
export default function ToolRequestActions({
  requestId,
  kind,
  status,
  role,
}: {
  requestId: string;
  kind: string;
  status: string;
  role: string;
}) {
  const t = useTranslations("tools.requests");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const resolve = (s: "DONE" | "REJECTED") =>
    startTransition(async () => {
      await resolveToolRequest(requestId, s);
      router.refresh();
    });
  const approve = () =>
    startTransition(async () => {
      await approveToolRequest(requestId);
      router.refresh();
    });

  const primary =
    "rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50";
  const secondary =
    "rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-50 disabled:opacity-50";

  const isAdmin = role === "ADMIN";
  const isKeeper = role === "STOREKEEPER";

  let buttons: React.ReactNode = null;
  if (kind === "PURCHASE" && status === "NEW" && isAdmin) {
    buttons = (
      <>
        <button className={primary} disabled={pending} onClick={() => resolve("DONE")}>
          {t("done")}
        </button>
        <button className={secondary} disabled={pending} onClick={() => resolve("REJECTED")}>
          {t("reject")}
        </button>
      </>
    );
  } else if (kind === "ISSUE" && status === "NEW" && isAdmin) {
    buttons = (
      <>
        <button className={primary} disabled={pending} onClick={approve}>
          {t("approve")}
        </button>
        <button className={secondary} disabled={pending} onClick={() => resolve("REJECTED")}>
          {t("reject")}
        </button>
      </>
    );
  } else if (kind === "ISSUE" && status === "APPROVED" && (isAdmin || isKeeper)) {
    buttons = (
      <>
        <button className={primary} disabled={pending} onClick={() => resolve("DONE")}>
          {t("issued")}
        </button>
        <button className={secondary} disabled={pending} onClick={() => resolve("REJECTED")}>
          {t("reject")}
        </button>
      </>
    );
  }

  if (!buttons) return null;
  return <span className="inline-flex gap-2">{buttons}</span>;
}
