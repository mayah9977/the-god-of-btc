// app/api/add/route.ts

import { NextResponse } from "next/server";
import { adminDB, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 이전에 쓰던 필드들을 adminDB용으로 그대로 정리
    const doc = {
      symbol: body.symbol ?? "BTCUSDT",
      body_symbol: body.body_symbol ?? "",
      timeframe: body.timeframe ?? "4H",
      venue: body.venue ?? "BINANCE",
      entry_zone:
        body.entry_zone && Array.isArray(body.entry_zone)
          ? body.entry_zone
          : [63000, 63300],
      targets:
        body.targets && Array.isArray(body.targets)
          ? body.targets
          : [64000, 65000],
      invalidation:
        typeof body.invalidation === "number"
          ? body.invalidation
          : 62000,
      received_at: FieldValue.serverTimestamp(),
      created_at: FieldValue.serverTimestamp(),
      source: "manual_add",
    };

    const ref = await adminDB.collection("signals_raw").add(doc);

    console.log("✅ /api/add 저장 완료:", ref.id);

    return NextResponse.json({ ok: true, id: ref.id }, { status: 200 });
  } catch (e: any) {
    console.error("❌ /api/add 에러:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}



