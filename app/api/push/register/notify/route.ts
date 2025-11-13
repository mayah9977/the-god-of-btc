export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminMsg } from '@/lib/firebase-admin';

/**
 * POST /api/push/notify
 * Body:
 * {
 *   topic: "all",
 *   title: "BTCUSDT LONG saved",
 *   body: "Entry: 67890 · TP: —",
 *   image: "https://…/preview.png",   // optional (큰 미리보기)
 *   icon: "/icon-192x192.png",        // optional
 *   badge: "/badge-72x72.png",        // optional
 *   link: "/admin"                    // 클릭 시 열 주소(상대/절대)
 * }
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const {
      topic = 'all',
      title = 'Notification',
      body = '',
      image,
      icon = '/icon-192x192.png',
      badge = '/badge-72x72.png',
      link = '/',
    } = b || {};

    const message = {
      topic,
      notification: {
        title,
        body,
        image,
      },
      webpush: {
        notification: {
          title,
          body,
          icon,
          badge,
          image,
          vibrate: [120, 60, 120],
          requireInteraction: true, // 사용자가 닫을 때까지 남게
          actions: [
            { action: 'open', title: '열기' },
            { action: 'dismiss', title: '닫기' },
          ],
          data: { click_action: link, url: link },
          tag: `topic:${topic}`,
          renotify: true,
        },
        headers: {
          Urgency: 'high',
          TTL: '60',
        },
        fcmOptions: {
          link, // 탭 없으면 새 탭
        },
      },
    };

    const id = await adminMsg.send(message as any);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    console.error('[push/notify] error', e);
    return NextResponse.json(
      { ok: false, err: String(e?.message || e) },
      { status: 500 },
    );
  }
}

