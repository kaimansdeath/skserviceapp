import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // Серверна перевірка сесії — головний рубіж захисту
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
