import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe частина конфігурації (без Prisma/bcrypt) — використовується у middleware.
 */
export const authConfig = {
  trustHost: true, // Railway/проксі: довіряємо заголовку Host
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  pages: { signIn: "/uk/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.brigadeId = (user as any).brigadeId ?? null;
        token.locale = (user as any).locale ?? "UK";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.brigadeId = (token.brigadeId as string | null) ?? null;
        session.user.locale = (token.locale as string) ?? "UK";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
