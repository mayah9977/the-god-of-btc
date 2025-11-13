// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initAdmin, adminDb, adminMsg, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await initAdmin();

  const { token, topic } = await req.json().catch(() => ({} as any));
  if (!token || !topic) {
    return NextResponse.json({ ok: false, error: "token/topic required" }, { status: 400 });
  }

  await adminMsg.subscribeToTopic([String(token)], String(topic));

  // 토큰 문서에 topic 추가
  await adminDb
    .collection("fcm_tokens")
    .doc(String(token))
    .set(
      { token: String(token), topics: [String(topic)], updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

  return NextResponse.json({ ok: true });
}

