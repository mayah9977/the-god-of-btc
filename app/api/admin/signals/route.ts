// app/api/admin/signals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initAdmin, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * 최근 신호 목록을 반환하는 관리자용 API
 * GET /api/admin/signals?limit=50
 */
export async function GET(req: NextRequest) {
  await initAdmin();

  const { searchParams } = new URL(req.url);
  const limitNum = Number(searchParams.get("limit") ?? 50);

  const snap = await adminDb
    .collection("signals_raw")
    .orderBy("createdAt", "desc")
    .limit(Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 50)
    .get();

  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ok: true, items });
}






