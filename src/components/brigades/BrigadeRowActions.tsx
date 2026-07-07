"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setBrigadeActive } from "@/app/actions/brigades";

export default function BrigadeRowActions({
  brigadeId,
  isActive,
}: {
  brigadeId: string;
  isActive: boolean;
}) {
  const t = useTranslations("brigades");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="text-sm font-medium text-neutral-500 hover:text-brand-orange disabled:opacity-50"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setBrigadeActive(brigadeId, !isActive);
          router.refresh();
        })
      }
    >
      {isActive ? t("deactivate") : t("activate")}
    </button>
  );
}
