import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Імена session-cookie NextAuth v5 (https / http)
const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"];

/**
 * Оптимістична перевірка: наявність cookie. Справжня валідація сесії —
 * на сервері у layout захищеної зони (src/app/[locale]/(dashboard)/layout.tsx).
 * auth() тут свідомо НЕ використовується: його обгортка за реверс-проксі
 * ламає rewrite-и next-intl (петля "Failed to proxy" на Railway).
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));
  const isLoginPage = /^\/(uk|ru)\/login/.test(pathname) || pathname === "/login";

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL("/uk/login", req.url));
  }
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/uk", req.url));
  }
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
