// app/api/admin/signals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initAdmin, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ✅ firebase-admin 초기화 (클라 SDK 아님)
  await initAdmin();

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;

  // ✅ adminDb (서버 SDK)로 Firestore 조회
  const snap = await adminDb
    .collection("signals_raw")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  return NextResponse.json({ ok: true, items }, { status: 200 });
}







