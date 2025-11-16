// app/api/webhook/signals/tv/route.ts
import { NextResponse } from "next/server";
import { adminDB, FieldValue /* , adminMsg */ } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * TradingView → Webhook → 이 엔드포인트
 * 헤더:  x-webhook-secret: <WEBHOOK_SECRET>
 * 바디 예:
 * { "symbol": "BTCUSDT", "title": "신호", "message": "롱 진입", "side": "long", "price": 68000 }
 */
export async function POST(req: Request) {
  try {
    // 0) Firebase Admin 초기화
    await initAdmin();

    // 1) 시크릿 검증
    const got = req.headers.get("x-webhook-secret");
    const expected = process.env.WEBHOOK_SECRET;
    if (!got || got !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2) 바디 파싱 및 검증
    const body = await req.json().catch(() => ({} as any));
    const { symbol, title, message, side, price } = body ?? {};
    if (!symbol || !title || !message) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }

    // 3) Firestore 저장 (서버 SDK)
    const doc = {
      symbol: String(symbol),
      title: String(title),
      message: String(message),
      side: side ? String(side) : "",
      price: typeof price === "number" ? price : Number(price ?? 0),
      source: "tradingview",
      createdAt: FieldValue.serverTimestamp(),
    };
    const ref = await adminDB.collection("signals_raw").add(doc);

    // // 4) (옵션) 토픽 푸시
    // const topics = ["signals", `sym-${symbol}`];
    // for (const t of topics) {
    //   await adminMsg.send({
    //     topic: t,
    //     notification: { title: `[${symbol}] ${title}`, body: message },
    //     data: { symbol: String(symbol), side: String(side ?? ""), price: String(doc.price) },
    //   });
    // }

    return NextResponse.json({ ok: true, id: ref.id }, { status: 200 });
  } catch (e: any) {
    console.error("❌ tv webhook error:", e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

