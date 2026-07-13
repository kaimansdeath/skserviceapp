"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function createBrigade(name: string) {
  await requireAdmin();
  if (!name.trim()) return { error: "EMPTY" as const };
  await prisma.brigade.create({ data: { name: name.trim() } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setBrigadeActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.brigade.update({ where: { id }, data: { isActive } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const userInput = z.object({
  name: z.string().min(1),
  login: z
    .string()
    .min(3)
    .regex(/^[a-z0-9_.-]+$/i),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "BRIGADE_LEADER", "BRIGADE_MEMBER", "STOREKEEPER", "VIEWER", "ACCOUNTANT"]),
  brigadeId: z.string().optional().nullable(),
});

export async function createUser(input: z.infer<typeof userInput>) {
  await requireAdmin();
  const data = userInput.parse(input);
  const exists = await prisma.user.findUnique({
    where: { login: data.login.trim().toLowerCase() },
  });
  if (exists) return { error: "LOGIN_TAKEN" as const };
  await prisma.user.create({
    data: {
      name: data.name.trim(),
      login: data.login.trim().toLowerCase(),
      passwordHash: bcrypt.hashSync(data.password, 10),
      role: data.role,
      brigadeId: ["BRIGADE_LEADER", "BRIGADE_MEMBER"].includes(data.role)
        ? data.brigadeId || null
        : null,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function resetPassword(userId: string, password: string) {
  await requireAdmin();
  if (password.length < 8) return { error: "TOO_SHORT" as const };
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: bcrypt.hashSync(password, 10) },
  });
  return { ok: true as const };
}

export async function setUserActive(userId: string, isActive: boolean) {
  const session = await requireAdmin();
  if (session.user.id === userId) return { error: "SELF" as const };
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Одноразовий код прив'язки Telegram (діє 24 години) */
export async function generateTgCode(userId: string) {
  await requireAdmin();
  const code = Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32))
  ).join("");
  await prisma.user.update({
    where: { id: userId },
    data: {
      tgLinkCode: code,
      tgLinkExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const, code };
}

/** Перейменування бригади */
export async function renameBrigade(id: string, name: string) {
  await requireAdmin();
  if (!name.trim()) return { error: "EMPTY" as const };
  await prisma.brigade.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Перейменування користувача */
export async function renameUser(id: string, name: string) {
  await requireAdmin();
  if (!name.trim()) return { error: "EMPTY" as const };
  await prisma.user.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
