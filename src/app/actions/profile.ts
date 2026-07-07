"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Зберігає мову інтерфейсу в профілі користувача */
export async function setUserLocale(locale: "uk" | "ru") {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { locale: locale === "ru" ? "RU" : "UK" },
  });
}
