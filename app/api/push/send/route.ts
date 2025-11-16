// app/api/push/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminMsg } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * POST /api/push/send
 * Body (예시)
 * {
 *   "targetType": "topic" | "token",
 *   "topic": "btc",           // targetType === "topic"일 때 필수
 *   "token": "<FCM_TOKEN>",   // targetType === "token"일 때 필수
 *   "title": "Bit Hacker — 새 신호 알림",
 *   "body": "BTC/USDT 롱 진입 신호 발생",
 *   "clickUrl": "https://the-god-of-btc.app/signal/123",
 *   "iconUrl": "/icons/bithacker-192.png",
 *   "imageUrl": "https://picsum.photos/800/400",
 *   "priority": "high" | "normal",
 *   "ttl": 3600,
 *   "requireInteraction": false
 * }
 */
export async function POST(req: NextRequest) {
  await initAdmin();

  const payload = await req.json().catch(() => ({}));
  const {
    targetType = "topic",
    topic,
    token,
    title,
    body,
    clickUrl,
    iconUrl,
    imageUrl,
    priority = "high",
    ttl = 3600,
    requireInteraction = false,
  } = payload ?? {};

  // 필수값 체크
  if (!title || !body) {
    return NextResponse.json({ ok: false, error: "title/body required" }, { status: 400 });
  }
  if (targetType === "topic" && !topic) {
    return NextResponse.json({ ok: false, error: "topic required" }, { status: 400 });
  }
  if (targetType === "token" && !token) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  // WebPush 옵션 구성 (웹 FCM)
  const webpush: import("firebase-admin/messaging").WebpushConfig = {
    fcmOptions: clickUrl ? { link: String(clickUrl) } : undefined,
    headers: {
      TTL: String(Number(ttl) || 3600),
      Urgency: priority === "high" ? "high" : "normal",
    },
    notification: {
      icon: iconUrl ? String(iconUrl) : undefined,
      image: imageUrl ? String(imageUrl) : undefined,
      requireInteraction: !!requireInteraction,
    },
  };

  const message: import("firebase-admin/messaging").Message = {
    notification: { title: String(title), body: String(body) },
    data: {
      clickUrl: String(clickUrl ?? ""),
      iconUrl: String(iconUrl ?? ""),
      imageUrl: String(imageUrl ?? ""),
    },
    webpush,
    ...(targetType === "topic" ? { topic: String(topic) } : { token: String(token) }),
  };

  const res = await adminMsg.send(message);
  return NextResponse.json({ ok: true, id: res });
}

