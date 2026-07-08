import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";
import { getSetting } from "@/src/lib/app-settings";
import webpush from "web-push";

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);

  const vapidPublic = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ sent: 0, error: "VAPID no configurado" });
  }

  webpush.setVapidDetails("mailto:contact@nexora.app", vapidPublic, vapidPrivate);

  const pushSubs = await prisma.pushSubscription.findMany({ where: { userId } });

  if (pushSubs.length === 0) {
    return NextResponse.json({ sent: 0, error: "No hay suscripciones push activas" });
  }

  const appName = await getSetting("app_name").catch(() => "Nexora Finance");

  let sent = 0;
  for (const sub of pushSubs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: "✅ Notificaciones funcionando",
          body: `Si ves esto, las notificaciones push están configuradas correctamente en ${appName}.`,
          tag: "nexora-test",
          data: { url: "/settings/notifications" },
        })
      );
      sent++;
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ sent, total: pushSubs.length });
}
