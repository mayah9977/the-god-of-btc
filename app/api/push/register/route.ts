// app/api/push/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDB, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {

  const { token, topic } = await req.json().catch(() => ({} as any));
  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  // 토큰 저장 / 갱신
  await adminDB.collection("fcm_tokens").doc(token).set(
    {
      token,
      topics: topic ? [String(topic)] : [],
      updatedAt: FieldValue.serverTimestamp(),
      source: "register_api",
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}





