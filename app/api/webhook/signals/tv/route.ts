import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { initAdmin, adminDb, adminMsg } from "@/lib/firebase-admin";

// ── 보안: TradingView → 우리 서버로 보낼 때 HMAC 서명(선택적 강력 권장)
// .env.local 에 WEBHOOK_SECRET=xxxxx 이미 있으시면 사용됩니다.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

// 원문 바디로 HMAC 검증 (서명 헤더: x-signature 또는 X-Signature)
function verifySignature(raw: string, sig?: string | null) {
  if (!WEBHOOK_SECRET) return true; // 시크릿이 없으면 검증 건너뜀(개발용)
  if (!sig) return false;
  const mac = crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(sig));
}

export async function POST(req: NextRequest) {
  await initAdmin();

  try {
    // 1) 보안: 원문 먼저 읽어서 HMAC 검증
    const raw = await req.text();
    const sig = req.headers.get("x-signature") || req.headers.get("X-Signature");
    if (!verifySignature(raw, sig)) {
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }

    // 2) JSON 파싱
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
    }

    // 3) idempotency(중복 방지) 키 구성
    const eventId: string =
      body.event_id ||
      body.alert_id ||
      crypto.createHash("sha1").update(raw).digest("hex"); // 바디 기반 해시

    const evtRef = adminDb.collection("webhook_events").doc(eventId);
    const evtSnap = await evtRef.get();
    if (evtSnap.exists) {
      // 이미 처리됨 → 200으로 무해 종료
      return NextResponse.json({ ok: true, dedup: true, eventId });
    }

    // 4) 정규화 (필요에 맞게 커스터마이즈)
    const symbol = String(body.symbol ?? body.ticker ?? "BTCUSDT").toUpperCase();
    const side = String(body.side ?? body.action ?? "long").toLowerCase(); // long/short
    const price = Number(body.price ?? body.close ?? 0);
    const topic = String(body.topic ?? "btc").toLowerCase(); // 구독 토픽
    const title =
      body.title ||
      `Signal • ${symbol} • ${side.toUpperCase()}${price ? ` @ ${price}` : ""}`;

    const normalized = {
      symbol,
      side,
      price,
      title,
      topic,
      image: body.image || "", // 있으면 푸시에 사용 가능
      link: body.link || `https://the-god-of-btc.app/signal/${eventId}`,
      receivedAt: new Date().toISOString(),
      raw: body, // 원본 보관(선택)
    };

    // 5) Firestore 저장 (피드/로그)
    await evtRef.set({ processedAt: new Date().toISOString(), ...normalized });
    const feedRef = await adminDb.collection("signals").add(normalized);

    // 6) 토픽 푸시 (웹/안드로이드 공통)
    const message: any = {
      topic,
      notification: {
        title: normalized.title,
        body: `${normalized.symbol} ${normalized.side.toUpperCase()}${normalized.price ? ` @ ${normalized.price}` : ""}`,
        imageUrl: normalized.image || undefined, // 데스크탑 크롬은 webpush.notification.image 사용
      },
      webpush: {
        notification: {
          icon: "/icons/bithacker-192.png",
          image: normalized.image || undefined,
          requireInteraction: true,
        },
        fcmOptions: { link: normalized.link },
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          imageUrl: normalized.image || undefined,
        },
      },
      data: {
        link: normalized.link,
        openInNewTab: "1",
        source: "webhook",
        signalId: feedRef.id,
      },
    };

    const resId = await adminMsg.send(message);

    return NextResponse.json({ ok: true, eventId, feedId: feedRef.id, push: resId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
