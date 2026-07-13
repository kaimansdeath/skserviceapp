"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { renameBrigade, renameUser } from "@/app/actions/brigades";

export default function RenameButton({
  kind,
  id,
  currentName,
}: {
  kind: "brigade" | "user";
  id: string;
  currentName: string;
}) {
  const t = useTranslations("brigades");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="ml-1.5 text-neutral-300 transition hover:text-brand-dark disabled:opacity-40"
      title={t("rename")}
      disabled={pending}
      onClick={() => {
        const name = window.prompt(t("renamePrompt"), currentName);
        if (!name || !name.trim() || name.trim() === currentName) return;
        startTransition(async () => {
          if (kind === "brigade") await renameBrigade(id, name);
          else await renameUser(id, name);
          router.refresh();
        });
      }}
    >
      ✎
    </button>
  );
}
