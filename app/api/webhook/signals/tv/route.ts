// app/api/webhook/tv/route.ts
import { NextResponse } from "next/server";
import { adminDB, adminMsg, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 0) 시크릿 검증: ?secret=... 으로 전달
    const url = new URL(req.url);
    const got = url.searchParams.get("secret");
    const expected = process.env.WEBHOOK_SECRET;

    console.log("🔎 Incoming TV webhook:", got, "expected:", expected);

    if (!expected || !got || got !== expected) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    // 1) 바디 파싱
    const body = await req.json().catch(() => ({} as any));
    console.log("📦 TV payload:", body);

    const {
      symbol,
      price,
      side,
      message,
      image,      // 🔹 TradingView에서 함께 보낼 수 있는 선택적 필드
      clickUrl,   // 🔹 직접 URL을 넘기고 싶다면
    } = body ?? {};

    if (!symbol || price === undefined) {
      return NextResponse.json(
        { ok: false, error: "symbol/price required" },
        { status: 400 },
      );
    }

    // 2) Firestore 저장 (signals_raw 컬렉션)
    const doc = {
      symbol: String(symbol),
      title: message ? String(message) : "TradingView Alert",
      message: message ? String(message) : "",
      side: side ? String(side) : "",
      price: Number(price),
      createdAt: FieldValue.serverTimestamp(),
      source: "tradingview",
      image: image ? String(image) : "",     // 🔹 이미지도 함께 저장 (선택)
    };

    const ref = await adminDB.collection("signals_raw").add(doc);
    console.log("📝 TV signal saved:", ref.id);

    // 3) 클릭 시 이동할 URL 계산
    //    - body.clickUrl 우선
    //    - 없으면 NEXT_PUBLIC_APP_URL + /signal/<id> 사용
    const baseUrl =
      (process.env.NEXT_PUBLIC_APP_URL as string | undefined) ??
      `${url.protocol}//${url.host}`;

    const finalClickUrl =
      clickUrl && typeof clickUrl === "string"
        ? clickUrl
        : `${baseUrl}/signal/${ref.id}`;

    // 4) 푸시 알림 발송 (topics: signals, sym-<SYMBOL>)
    const topics = ["signals", `sym-${doc.symbol}`];

    const titleText = `[${doc.symbol}] ${doc.title}`;
    const bodyText = doc.message || `Price: ${doc.price}`;

    for (const t of topics) {
      await adminMsg.send({
        topic: t,
        notification: {
          title: titleText,
          body: bodyText,
          // image: doc.image || undefined, // 필요하면 여기에도 image 추가 가능
        },
        data: {
          symbol: doc.symbol,
          side: doc.side,
          price: String(doc.price),
          source: "tv",

          // 🔽 서비스워커에서 쓸 “고급 옵션”들
          clickUrl: finalClickUrl,
          image: doc.image || "",
          requireInteraction: "true",           // 사용자가 닫을 때까지 유지
          actionOpenTitle: "시그널 열기",
          actionCloseTitle: "닫기",
          tag: "btc-signal",
          renotify: "true",
        },
        webpush: {
          headers: {
            Urgency: "high", // high-priority
          },
          notification: {
            requireInteraction: true,
          },
          fcmOptions: {
            link: finalClickUrl,
          },
        },
      });
    }

    console.log("📣 push sent to topics:", topics);

    return NextResponse.json(
      { ok: true, id: ref.id },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("❌ tv webhook error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}



