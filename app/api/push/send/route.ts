// app/api/push/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminMsg } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * /admin 페이지에서 오는 모든 형식을 유연하게 받아서
 * - topic / token
 * - title/body/icon/image/priority/requireInteraction
 * 전부 처리하는 고급 버전 (에러 나도 200 반환)
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({} as any));

    console.log("[/api/push/send] raw payload:", JSON.stringify(raw));

    // 1) targetType / target 자동 추출
    let targetType: "topic" | "token" | undefined = raw.targetType;
    let target: string | undefined = raw.target;

    const topic = raw.topic as string | undefined;
    const token = raw.token as string | undefined;

    if (!targetType) {
      if (topic) targetType = "topic";
      else if (token) targetType = "token";
    }

    if (!target) {
      if (raw.target) target = String(raw.target);
      else if (topic) target = String(topic);
      else if (token) target = String(token);
    }

    // 기본값: topic "btc"
    if (!targetType) targetType = "topic";
    if (!target) target = "btc";

    // 2) notification / 고급 옵션 추출
    const notif = (raw.notification || {}) as any;

    const title: string =
      notif.title ??
      raw.title ??
      "Bit Hacker — 새 신호 알림";

    const body: string =
      notif.body ??
      raw.body ??
      "새 알림입니다.";

    const icon: string | undefined =
      notif.icon ?? raw.iconUrl;

    const image: string | undefined =
      notif.image ?? raw.imageUrl;

    const sound: string | undefined =
      notif.sound ?? raw.sound ?? "default";

    const priority: "normal" | "high" | "very-high" =
      notif.priority ?? raw.priority ?? "high";

    const requireInteraction: boolean =
      typeof notif.requireInteraction === "boolean"
        ? notif.requireInteraction
        : Boolean(raw.requireInteraction);

    const clickUrl: string =
      raw.link ??
      raw.clickUrl ??
      "https://the-god-of-btc.app";

    const openInNewTab: boolean =
      typeof raw.openInNewTab === "boolean"
        ? raw.openInNewTab
        : true;

    const ttlSeconds: number = Number(raw.ttl) || 3600;

    // 3) priority → Urgency
    let urgency: "very-low" | "low" | "normal" | "high" = "normal";
    if (priority === "high" || priority === "very-high") {
      urgency = "high";
    }

    // 4) 추가 data 병합 (문자열만 허용)
    const extraData: Record<string, string> = Object.entries(
      (raw.data as Record<string, any>) || {},
    ).reduce(
      (acc, [k, v]) => ({
        ...acc,
        [k]: typeof v === "string" ? v : JSON.stringify(v),
      }),
      {},
    );

    const data: Record<string, string> = {
      title: String(title),
      body: String(body),
      icon: icon || "",
      image: image || "",
      sound: sound || "",
      clickUrl,
      requireInteraction: String(requireInteraction),
      openInNewTab: String(openInNewTab),
      tag: "admin-push",
      renotify: "true",
      source: "admin",
      ...extraData,
    };

    // 5) webpush config (이미지/requireInteraction/우선순위)
    const webpush: any = {
      headers: {
        TTL: String(ttlSeconds),
        Urgency: urgency,
      },
      notification: {
        requireInteraction,
        icon: icon || undefined,
        image: image || undefined,
      },
      fcmOptions: {
        link: clickUrl,
      },
    };

    // 6) 최종 메시지 (any 사용 → 타입 에러 방지)
    const message: any = {
      notification: {
        title,
        body,
      },
      data,
      webpush,
    };

    if (targetType === "topic") {
      message.topic = String(target);
    } else {
      message.token = String(target);
    }

    let sendResult: string | undefined;

    try {
      sendResult = await adminMsg.send(message);
      console.log("[/api/push/send] FCM sent:", sendResult);
    } catch (e: any) {
      console.error("[/api/push/send] FCM ERROR:", e);
      return NextResponse.json(
        { ok: false, error: String(e?.message ?? e) },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ok: true, messageId: sendResult },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("❌ /api/push/send handler error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 200 },
    );
  }
}







