// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDB, adminMsg } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token as string | undefined;
    const topics = (body.topics as string[] | undefined) ?? [];

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing token" },
        { status: 400 }
      );
    }

    // 최소 1개는 넣어주기 (기본 signals)
    const uniqTopics = [...new Set(topics.filter(Boolean))];
    if (!uniqTopics.length) uniqTopics.push("signals");

    console.log("[push/subscribe] token:", token);
    console.log("[push/subscribe] topics:", uniqTopics);

    // 1) Firestore 에 토큰 + 토픽 저장
    const docRef = adminDB.collection("fcm_tokens").doc(token);
    await docRef.set(
      {
        topics: uniqTopics,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // 2) FCM 토픽에 실제로 subscribe
    //    여러 토픽일 때 하나씩 subscribeToTopic 호출
    for (const t of uniqTopics) {
      const res = await adminMsg.subscribeToTopic(token, t);
      console.log("[push/subscribe] subscribeToTopic OK:", t, res);
    }

    return NextResponse.json({
      ok: true,
      token,
      topics: uniqTopics,
    });
  } catch (e: any) {
    console.error("[push/subscribe] error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}



