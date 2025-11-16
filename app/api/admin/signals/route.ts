// app/api/admin/signals/route.ts
import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// 관리자용: 최근 시그널 목록 조회
export async function GET() {
  try {
    const snap = await adminDB
      .collection("signals")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e: any) {
    console.error("admin/signals error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}








