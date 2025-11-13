export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, adminMsg } from "@/lib/firebase-admin";
import admin from "firebase-admin";

/** ✅ GET: 관리자 페이지에서 최근 시그널 목록 불러오기 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "100");

    const snap = await adminDb
      .collection("signals_raw")
      .orderBy("createdAt", "desc")
      .limit(isNaN(limit) ? 100 : limit)
      .get();

    const items = snap.docs.map((d) => {
      const data: any = d.data();
      const createdAtIso =
        data?.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : null;

      return {
        id: d.id,
        ...data,
        createdAt: createdAtIso, // ← JSON으로 직렬화
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("signals GET error:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/** ✅ POST: 새 시그널 저장 + FCM 푸시 발송 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 1) Firestore 저장
    const ref = await adminDb.collection("signals_raw").add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2) 전체 토픽(all)으로 FCM 푸시 발송
    await adminMsg.send({
      topic: "all",
      notification: {
        title: `New Signal • ${data.symbol}`,
        body: `${String(data.side).toUpperCase()} | Entry: ${data.entry ?? "—"} | TP: ${data.target ?? "—"}`,
      },
      webpush: {
        fcmOptions: { link: "/signals" },
        notification: { icon: "/icon-192x192.png" },
      },
      data: {
        click_action: "/signals",
        symbol: data.symbol ?? "",
        side: String(data.side ?? ""),
      },
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e: any) {
    console.error("signals POST error:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}





