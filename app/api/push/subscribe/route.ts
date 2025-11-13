// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initAdmin, adminMsg } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  await initAdmin();
  const { token, topic } = await req.json();
  if (!token || !topic) {
    return NextResponse.json({ error: "token/topic required" }, { status: 400 });
  }
  const res = await adminMsg.subscribeToTopic([token], topic);
  return NextResponse.json({ ok: true, res });
}
