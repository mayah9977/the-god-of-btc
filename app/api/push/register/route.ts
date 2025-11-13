import { NextResponse } from "next/server";
import { adminDb, adminMsg } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const token = body?.token as string | undefined;
    const topics = Array.isArray(body?.topics) ? (body.topics as string[]) : null;

    if (!token) {
      return NextResponse.json({ ok: false, err: "token_missing" }, { status: 400 });
    }

    // 토큰 저장(merge)
    await adminDb.collection("fcm_tokens").doc(token).set(
      {
        userId: body?.userId ?? null,
        updatedAt: new Date(),
        platform: "web",
        enabled: true,
      },
      { merge: true }
    );

    // 구독 처리: topics가 있으면 그 토픽들, 없으면 "all"
    if (topics && topics.length) {
      const uniq = [...new Set(topics.map((t: string) => String(t).trim()).filter(Boolean))];
      for (const t of uniq) {
        await adminMsg.subscribeToTopic(token, t);
      }
      return NextResponse.json({ ok: true, subscribed: uniq });
    } else {
      await adminMsg.subscribeToTopic([token], "all");
      return NextResponse.json({ ok: true, subscribed: ["all"] });
    }
  } catch (e: any) {
    console.error("[push/register] error", e);
    return NextResponse.json({ ok: false, err: String(e?.message || e) }, { status: 500 });
  }
}




