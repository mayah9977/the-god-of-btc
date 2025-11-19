// app/api/push/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminMsg } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({} as any));

    console.log("[/api/push/send] raw payload:", JSON.stringify(raw));

    // 1) 제목/본문 대충 결정 (없으면 기본값)
    const title =
      raw?.notification?.title ??
      raw?.title ??
      "Bit Hacker — TEST";
    const body =
      raw?.notification?.body ??
      raw?.body ??
      "테스트 알림입니다.";

    // 2) topic / token 아무거나 받기 (없으면 topic 'btc'로)
    const topic = raw?.target ?? raw?.topic ?? "btc";

    const clickUrl =
      raw?.link ??
      raw?.clickUrl ??
      "https://the-god-of-btc.app";

    // 3) FCM 전송 (실패해도 에러만 로그에 찍고, 응답은 200으로 돌려줌)
    try {
      const res = await adminMsg.send({
        topic: String(topic),
        notification: {
          title: String(title),
          body: String(body),
        },
        data: {
          clickUrl,
        },
        webpush: {
          fcmOptions: { link: clickUrl },
        },
      });

      console.log("[/api/push/send] FCM sent:", res);
    } catch (e: any) {
      console.error("[/api/push/send] FCM ERROR:", e);
      // 여기서는 굳이 400/500 안 주고, 프런트에는 ok:false 만 알려줍니다.
      return NextResponse.json(
        { ok: false, error: String(e?.message ?? e) },
        { status: 200 },
      );
    }

    // 4) 항상 200 OK
    return NextResponse.json(
      { ok: true },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("❌ /api/push/send handler error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 200 }, // 여기서도 200
    );
  }
}






