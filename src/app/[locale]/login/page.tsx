"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(false);
    const res = await signIn("credentials", {
      login,
      password,
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(true);
      return;
    }
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-xl font-bold tracking-tight">
            <span className="text-brand-dark">СТАН</span>{" "}
            <span className="text-brand">КОМПЛЕКТ</span>
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            {t("app.shortTitle")}
          </div>
        </div>
        <h1 className="mb-4 text-center text-base font-semibold">
          {t("auth.welcome")}
        </h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-600">
              {t("auth.login")}
            </span>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-600">
              {t("auth.password")}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>
          {error && (
            <p className="text-sm text-brand-orange">
              {t("auth.invalidCredentials")}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("auth.signIn")}
          </button>
        </form>
      </div>
    </main>
  );
}
