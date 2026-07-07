"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { setUserLocale } from "@/app/actions/profile";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: "uk" | "ru") {
    if (next === locale) return;
    startTransition(async () => {
      await setUserLocale(next); // зберігаємо вибір у профілі
      const newPath = pathname.replace(/^\/(uk|ru)/, `/${next}`);
      router.push(newPath);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5 text-xs font-semibold">
      {(["uk", "ru"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          disabled={pending}
          className={
            "rounded-md px-2 py-1 uppercase transition " +
            (l === locale
              ? "bg-brand text-white"
              : "text-neutral-500 hover:text-neutral-800")
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}
