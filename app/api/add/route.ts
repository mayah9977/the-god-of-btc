import { NextResponse } from "next/server";
import { db } from "@/app/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore/lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const docRef = await addDoc(collection(db, "signals_raw"), {
      symbol: body.symbol ?? "BTCUSDT",
      signal: body.signal ?? "LONG",
      timeframe: body.timeframe ?? "4H",
      venue: body.venue ?? "BINANCE",
      entry_zone: body.entry_zone ?? [63000, 63300],
      targets: body.targets ?? [64000, 65000],
      invalidation: body.invalidation ?? 62000,
      received_at: serverTimestamp(),
      created_at: serverTimestamp(),
    });
    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}


