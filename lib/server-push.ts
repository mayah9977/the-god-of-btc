// lib/server-push.ts
// ✅ 서버에서 FCM Web Push를 보내는 유틸 함수 예시
// - adminDb / adminMsg 사용
// - TypeScript 경고 제거 (any 명시함)

import { adminDb, adminMsg } from "@/lib/firebase-admin";

type PushPayload = {
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, string>;
  topic?: string;
};

// ✅ 단일 토픽 or 전체(all) 발송
export async function sendPush(payload: PushPayload) {
  try {
    const topic = payload.topic || "all";

    const message = {
      topic,
      notification: {
        title: payload.title,
        body: payload.body ?? "",
      },
      webpush: {
        fcmOptions: {
          link: payload.link ?? "/",
        },
      },
      data: payload.data || {},
    };

    const res = await adminMsg.send(message as any);
    console.log("[sendPush] success:", res);
    return { ok: true, res };
  } catch (e: any) {
    console.error("[sendPush] error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
}

// ✅ 여러 토픽에 동시에 보내고 싶으면 이렇게
export async function sendPushMultiTopics(topics: string[], payload: Omit<PushPayload, "topic">) {
  try {
    const uniq = [...new Set(topics.map((t: any) => String(t).trim()).filter(Boolean))];

    const results: any[] = [];

    for (const t of uniq) {
      const msg = {
        topic: t,
        notification: {
          title: payload.title,
          body: payload.body ?? "",
        },
        webpush: {
          fcmOptions: {
            link: payload.link ?? "/",
          },
        },
        data: payload.data || {},
      };

      const res = await adminMsg.send(msg as any);
      results.push({ topic: t, res });
    }

    console.log("[sendPushMultiTopics] done:", results);
    return { ok: true, results };
  } catch (e: any) {
    console.error("[sendPushMultiTopics] error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
}

// ✅ 특정 토큰 목록에 직접 보낼 때 (멀티캐스트)
export async function sendPushTokens(tokens: string[], payload: PushPayload) {
  try {
    if (!tokens.length) return { ok: false, error: "no tokens" };

    const msg = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body ?? "",
      },
      webpush: {
        fcmOptions: {
          link: payload.link ?? "/",
        },
      },
      data: payload.data || {},
    };

    // admin.messaging().sendEachForMulticast()
    const res = await adminMsg.sendEachForMulticast(msg as any);
    console.log("[sendPushTokens] done:", res);
    return { ok: true, res };
  } catch (e: any) {
    console.error("[sendPushTokens] error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
}

