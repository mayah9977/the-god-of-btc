// 파일 위치: app/api/push/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { initAdmin } from "@/lib/firebase-admin"; // 이미 프로젝트에 있는 파일

export async function POST(req: NextRequest) {
  try {
    await initAdmin(); // firebase-admin 초기화

    const body = await req.json();
    const {
      targetType,
      target,
      notification = {},
      link,
      openInNewTab = true,
      ttl = 3600,
      data = {},
    } = body || {};

    if (!targetType || !target) {
      return NextResponse.json({ error: "targetType/target 누락" }, { status: 400 });
    }

    // 웹 알림 옵션
    const webpush: any = {
      headers: { TTL: String(ttl) },
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        image: notification.image,
        requireInteraction: !!notification.requireInteraction,
      },
      fcmOptions: {
        link: link || undefined,
      },
    };

    // Android용 (웹에서는 제한적)
    const android: any = {
      priority: notification.priority === "very-high" ? "high" : notification.priority || "high",
      notification: {
        sound: notification.sound || "default",
        icon: notification.icon,
        imageUrl: notification.image,
        sticky: !!notification.requireInteraction,
      },
      ttl,
    };

    // Service Worker 클릭 시 새창/같은창 처리 위한 데이터 전달
    const message: any = {
      data: {
        ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        openInNewTab: openInNewTab ? "1" : "0",
        link: link || "",
      },
      webpush,
      android,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image,
      },
    };

    // 토픽 또는 토큰으로 발송
    if (targetType === "topic") {
      message.topic = target;
    } else {
      message.token = target;
    }

    const messaging = getMessaging();
    const res = await messaging.send(message);

    return NextResponse.json({ ok: true, message: res });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
