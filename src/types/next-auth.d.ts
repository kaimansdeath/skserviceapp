import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      brigadeId: string | null;
      locale: string;
    } & DefaultSession["user"];
  }
}
