// app/api/webhook/signals/route.ts
import { NextResponse } from "next/server";
import { adminDB, FieldValue /* , adminMsg */ } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 0) Firebase Admin 1회 초기화

    // 1) 시크릿 검증
    const got = req.headers.get("x-webhook-secret");
    const expected = process.env.WEBHOOK_SECRET;
    if (!got || got !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2) 바디 파싱
    const body = await req.json();
    const { symbol, title, message, side, price } = body ?? {};
    if (!symbol || !title || !message) {
      return NextResponse.json(
        { ok: false, error: "missing fields" },
        { status: 400 }
      );
    }

    // 3) ✅ Firestore 저장
    const doc = {
      symbol: String(symbol),
      title: String(title),
      message: String(message),
      side: side ? String(side) : "",
      price:
        typeof price === "number"
          ? price
          : Number(price ?? 0),
      createdAt: FieldValue.serverTimestamp(),
      source: "webhook",
    };

    const ref = await adminDB.collection("signals").add(doc);

    /* 4) 🔕 (다음 단계에서 켭니다) 토픽 푸시
    const topics = ["signals", `sym-${symbol}`];
    for (const t of topics) {
      await adminMsg.send({
        topic: t,
        notification: {
          title: `[${symbol}] ${title}`,
          body: message,
        },
        data: {
          symbol: String(symbol),
          side: String(side ?? ""),
          price: String(doc.price),
        },
      });
    }
    */

    return NextResponse.json({ ok: true, id: ref.id }, { status: 200 });
  } catch (e: any) {
    console.error("❌ webhook error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}




