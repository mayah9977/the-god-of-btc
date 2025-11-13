export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminMsg } from '@/lib/firebase-admin'; // 이미 쓰시던 인스턴스

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = body?.topic ?? 'all';
    const title = body?.title ?? 'New Signal • BTCUSDT';
    const bodyText = body?.body ?? '테스트 푸시입니다. 안드로이드에서 잘 뜨면 성공!';

    // FCM WebPush 옵션 (클릭 시 열 탭 지정)
    const message = {
      topic,
      notification: {
        title,
        body: bodyText,
      },
      webpush: {
        fcmOptions: {
          link: '/', // 클릭 시 열 주소(원하면 '/admin' 등으로 변경)
        },
        headers: {
          Urgency: 'high',
        },
      },
    };

    const res = await adminMsg.send(message as any);
    return NextResponse.json({ ok: true, id: res });
  } catch (e: any) {
    console.error('[push/test] error', e);
    return NextResponse.json({ ok: false, err: String(e?.message || e) }, { status: 500 });
  }
}
