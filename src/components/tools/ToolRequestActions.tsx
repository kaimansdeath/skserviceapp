"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { resolveToolRequest } from "@/app/actions/tools";

export default function ToolRequestActions({ requestId }: { requestId: string }) {
  const t = useTranslations("tools.requests");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (status: "DONE" | "REJECTED") =>
    startTransition(async () => {
      await resolveToolRequest(requestId, status);
      router.refresh();
    });

  return (
    <span className="inline-flex gap-2">
      <button
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        disabled={pending}
        onClick={() => act("DONE")}
      >
        {t("done")}
      </button>
      <button
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => act("REJECTED")}
      >
        {t("reject")}
      </button>
    </span>
  );
}
