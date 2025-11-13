// app/api/webhook/signals/route.ts
import { NextResponse } from "next/server";
import { adminDB, FieldValue /*, adminMsg */ } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 1) 시크릿 검증
    const got = req.headers.get("x-webhook-secret");
    const expected = process.env.WEBHOOK_SECRET;
    console.log("🔎 Incoming webhook:", got, "expected:", expected);
    if (!got || got !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2) 바디 파싱
    const body = await req.json();
    console.log("📦 payload:", body);

    const { symbol, title, message, side, price } = body ?? {};
    if (!symbol || !title || !message) {
      return NextResponse.json(
        { ok: false, error: "missing fields" },
        { status: 400 }
      );
    }

    // 3) ✅ Firestore 저장
    const doc = {
      symbol,
      title,
      message,
      side: side ?? "",
      price: typeof price === "number" ? price : Number(price ?? 0),
      createdAt: FieldValue.serverTimestamp(),
      source: "webhook",
    };
    const ref = await adminDB.collection("signals").add(doc);
    console.log("📝 saved:", ref.id);

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
    console.log("📣 push sent to topics:", topics);
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



