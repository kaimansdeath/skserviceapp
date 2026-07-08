"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { resetPassword, setUserActive, generateTgCode } from "@/app/actions/brigades";

export default function UserRowActions({
  userId,
  isActive,
  canLinkTg,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  canLinkTg: boolean;
  isSelf: boolean;
}) {
  const t = useTranslations("brigades");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState<string | null>(null);

  function onResetPassword() {
    const pw = window.prompt(t("newPasswordPrompt"));
    if (!pw) return;
    startTransition(async () => {
      const res = await resetPassword(userId, pw);
      if ("ok" in res) window.alert(t("passwordChanged"));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        className="font-medium text-neutral-500 hover:text-brand-dark disabled:opacity-50"
        disabled={pending}
        onClick={onResetPassword}
      >
        {t("resetPassword")}
      </button>
      {canLinkTg && (
        <button
          className="font-medium text-neutral-500 hover:text-brand-dark disabled:opacity-50"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await generateTgCode(userId);
              if ("code" in res) setCode(res.code);
              router.refresh();
            })
          }
        >
          {t("generateCode")}
        </button>
      )}
      {!isSelf && (
        <button
          className="font-medium text-neutral-500 hover:text-brand-orange disabled:opacity-50"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setUserActive(userId, !isActive);
              router.refresh();
            })
          }
        >
          {isActive ? t("deactivate") : t("activate")}
        </button>
      )}
      {code && (
        <span className="rounded-lg bg-brand/10 px-2 py-1 font-mono text-sm font-bold text-brand-dark">
          {t("codeHint", { code })}
        </span>
      )}
    </div>
  );
}
