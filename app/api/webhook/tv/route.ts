// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebase-admin';
import { sendTopicPush, sendUserTopicPush } from '@/lib/server-push';
import { checkUserRulesForTvSignal } from '@/lib/notification-rules';

export const runtime = 'nodejs';

type TvPayload = {
  symbol?: string;       // TV alert 에서 전달하는 symbol (예: BTCUSDT)
  side?: 'LONG' | 'SHORT' | string;
  strategyId?: string;   // 전략 ID (있으면 Path3에서 사용)
  label?: string;        // alert 이름
  message?: string;      // alert text
  price?: number;
  [key: string]: any;
};

function getNowKst() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'WEBHOOK_SECRET not configured' },
      { status: 500 },
    );
  }

  // TV 쪽에서 보낸 헤더 예: Authorization: Bearer <WEBHOOK_SECRET>
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  let payload: TvPayload;
  try {
    payload = (await req.json()) as TvPayload;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

  const now = getNowKst();
  const symbol = (payload.symbol ?? 'BTCUSDT').toUpperCase();
  const side = (payload.side ?? '').toUpperCase() || 'UNKNOWN';

  // 1) Firestore 에 raw 시그널 저장
  const col = adminDB.collection('signals_raw');
  const docRef = await col.add({
    ...payload,
    symbol,
    side,
    createdAt: now,
    createdAtMs: now.getTime(),
    source: 'tradingview',
  });

  console.log('[TV] signal saved:', docRef.id, symbol, side);

  // 2) Path1: 시그널 토픽 푸시 (signals + 심볼별)
  const title = `[TV] ${symbol} ${side} signal`;
  const body =
    payload.message ||
    `New TradingView signal (${symbol} ${side}) has been triggered.`;

  await sendTopicPush('signals', title, body, {
    symbol,
    side,
    docId: docRef.id,
    source: 'tv',
  });

  // 심볼별 토픽 (예: sym-BTCUSDT)
  await sendTopicPush(`sym-${symbol}`, title, body, {
    symbol,
    side,
    docId: docRef.id,
    source: 'tv',
  });

  // 3) Path3: 전략 진입 신호 관련 사용자 조건 처리
  await checkUserRulesForTvSignal({ id: docRef.id, ...payload, symbol, side });

  return NextResponse.json({ ok: true, id: docRef.id });
}
