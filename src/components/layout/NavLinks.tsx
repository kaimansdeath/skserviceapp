"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";

const ITEMS: Array<{ href: string; key: string; roles?: string[] }> = [
  { href: "/", key: "dashboard" },
  { href: "/tasks", key: "tasks" },
  { href: "/archive", key: "archive" },
  { href: "/requests", key: "requests", roles: ["ADMIN", "VIEWER"] },
  { href: "/clients", key: "clients" },
  { href: "/machines", key: "machines" },
  { href: "/brigades", key: "brigades", roles: ["ADMIN", "VIEWER"] },
  { href: "/tools", key: "tools" },
  { href: "/reports", key: "reports", roles: ["ADMIN", "VIEWER", "ACCOUNTANT"] },
];

// Обмежені ролі бачать лише фіксований набір пунктів (решта — за загальним правилом roles/без обмежень)
const RESTRICTED_ROLE_KEYS: Record<string, string[]> = {
  BRIGADE_LEADER: ["dashboard", "tasks", "archive", "tools"],
  BRIGADE_MEMBER: ["dashboard", "tasks", "archive"],
  STOREKEEPER: ["dashboard", "tools"],
};

export default function NavLinks({
  role,
  requestsBadge = 0,
}: {
  role: string;
  requestsBadge?: number;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const restrictedKeys = RESTRICTED_ROLE_KEYS[role];
  const items = restrictedKeys
    ? ITEMS.filter((i) => restrictedKeys.includes(i.key))
    : ITEMS.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {items.map((i) => {
        const active =
          i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={
              "rounded-lg px-3 py-1.5 transition " +
              (active
                ? "bg-brand/10 font-semibold text-brand-dark"
                : "text-neutral-600 hover:bg-neutral-100")
            }
          >
            {t(i.key as any)}
          </Link>
        );
      })}
    </nav>
  );
}
