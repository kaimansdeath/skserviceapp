import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import LocaleSwitcher from "./LocaleSwitcher";
import PushToggle from "./PushToggle";
import SignOutButton from "./SignOutButton";
import NavLinks from "./NavLinks";

export default async function Header() {
  const t = await getTranslations();
  const session = await auth();
  const role = session?.user?.role ?? "";

  return (
    <header className="sticky top-0 z-[1000] border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="shrink-0 text-base font-bold tracking-tight">
          <span className="text-brand-dark">СТАН</span>{" "}
          <span className="text-brand">КОМПЛЕКТ</span>
          <span className="ml-2 hidden text-xs font-medium text-neutral-400 sm:inline">
            {t("app.shortTitle")}
          </span>
        </Link>
        <NavLinks role={role} />
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden text-sm text-neutral-600 md:inline">
            {session?.user?.name}
            <span className="ml-1 text-xs text-neutral-400">
              · {t(`roles.${role}` as any)}
            </span>
          </span>
          <PushToggle />
          <LocaleSwitcher />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
