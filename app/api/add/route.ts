// app/api/add/route.ts
import { NextResponse } from "next/server";
import { initAdmin, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ✅ firebase-admin 초기화 (서버 전용)
    await initAdmin();

    // ✅ TradingView / 테스트에서 보낸 JSON 바디 파싱
    const body = await req.json();

    // 기존에 쓰시던 필드들 그대로 유지 (없으면 기본값)
    const doc = {
      symbol: body.symbol ?? "BTCUSDT",
      signal: body.signal ?? "LONG",
      timeframe: body.timeframe ?? "4H",
      venue: body.venue ?? "BINANCE",
      entry_zone: body.entry_zone ?? [63000, 63300],
      targets: body.targets ?? [64000, 65000],
      invalidation: body.invalidation ?? 62000,
      // 서버 시간
      received_at: new Date(),
      created_at: new Date(),
      source: "manual-add",
    };

    // ✅ 서버 Firestore(adminDb)에 저장
    const ref = await adminDb.collection("signals_raw").add(doc);

    return NextResponse.json({ ok: true, id: ref.id }, { status: 200 });
  } catch (e: any) {
    console.error("❌ /api/add error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}


