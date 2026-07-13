import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:service@stan-komplekt.ua",
    pub,
    priv
  );
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/** Надіслати push всім підпискам конкретних користувачів; мертві підписки чистяться */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !ensureConfigured()) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 }
        );
      } catch (e: any) {
        // 404/410 — підписка більше не існує (перевстановлений браузер тощо)
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}

/** Push користувачам за ролями */
export async function sendPushToRoles(roles: string[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const users = await prisma.user.findMany({
    where: { role: { in: roles as any }, isActive: true },
    select: { id: true },
  });
  await sendPushToUsers(users.map((u: any) => u.id), payload);
}
