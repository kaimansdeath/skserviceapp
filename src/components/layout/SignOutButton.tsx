"use client";

import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";

export default function SignOutButton() {
  const t = useTranslations("auth");
  const locale = useLocale();
  return (
    <button
      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
      className="text-sm text-neutral-500 transition hover:text-brand-orange"
    >
      {t("signOut")}
    </button>
  );
}
