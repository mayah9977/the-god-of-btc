// app/api/webhook/tv/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebase-admin';
import { pushTvSignalToTopics } from '@/lib/server-push';
import { checkUserRulesForTvSignal } from '@/lib/notification-rules';
import { computeRuleScore } from '@/lib/signal-scoring';

export const runtime = 'nodejs';

type TvPayload = {
  symbol?: string; // 예: BTCUSDT
  side?: 'LONG' | 'SHORT' | string;
  strategyId?: string;
  label?: string;
  message?: string;
  price?: number;
  meta?: {
    fundingRate?: number;
    oiChangePct?: number;
    exchangeNetflow?: number;
    whaleRatio?: number;
    [key: string]: any;
  };
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

  // --------- 1) AI 점수 계산 ---------
  const { score, grade } = computeRuleScore({
    side,
    meta: payload.meta ?? {},
  });

  // type: "ai" / "rule" 등 구분 (없으면 ai 로)
  const signalType = (payload.type as string) ?? 'ai';

  // --------- 2) Firestore 저장 (signals_raw) ---------
  const col = adminDB.collection('signals_raw');

  const baseDoc = {
    ...payload,
    symbol,
    side,
    createdAt: now,
    createdAtMs: now.getTime(),
    source: payload.source ?? 'tradingview',
    type: signalType,
    score,
    grade,
  };

  const docRef = await col.add(baseDoc);

  console.log('[TV] signal saved:', docRef.id, symbol, side, score, grade);

  // --------- 3) 토픽 푸시 (다국어 템플릿) ---------
  await pushTvSignalToTopics({
    ...payload,
    symbol,
    side,
    docId: docRef.id,
    score,
    grade,
    type: signalType,
  });

  // --------- 4) 사용자 개별 룰 체크 ---------
  await checkUserRulesForTvSignal({
    id: docRef.id,
    ...payload,
    symbol,
    side,
    score,
    grade,
    type: signalType,
  });

  return NextResponse.json({ ok: true, id: docRef.id, score, grade });
}



