"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { closeRequest, deleteRequest } from "@/app/actions/requests";

export default function RequestRowActions({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const t = useTranslations("requests");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {status === "NEW" && (
        <button
          className="text-sm font-medium text-neutral-500 hover:text-brand-dark disabled:opacity-40"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await closeRequest(requestId);
              router.refresh();
            })
          }
        >
          {t("close")}
        </button>
      )}
      <button
        className="text-neutral-300 transition hover:text-red-600 disabled:opacity-40"
        title={t("delete")}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("deleteConfirm"))) return;
          startTransition(async () => {
            await deleteRequest(requestId);
            router.refresh();
          });
        }}
      >
        ✕
      </button>
    </span>
  );
}
