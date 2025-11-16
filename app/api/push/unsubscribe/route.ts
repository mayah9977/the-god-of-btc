// app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDB, adminMsg, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {

  const { token, topic } = await req.json().catch(() => ({} as any));
  if (!token || !topic) {
    return NextResponse.json({ ok: false, error: "token/topic required" }, { status: 400 });
  }

  await adminMsg.unsubscribeFromTopic([String(token)], String(topic));

  await adminDB
    .collection("fcm_tokens")
    .doc(String(token))
    .set(
      { token: String(token), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

  return NextResponse.json({ ok: true });
}

