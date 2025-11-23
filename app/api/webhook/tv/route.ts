// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebase-admin';
import { pushTvSignalToTopics } from '@/lib/server-push';
import { checkUserRulesForTvSignal } from '@/lib/notification-rules';
import { computeRuleScore } from '@/lib/signal-scoring';

export const runtime = 'nodejs';

type TvPayload = {
  symbol?: string;       // TV alert 에서 전달하는 symbol (예: BTCUSDT)
  side?: 'LONG' | 'SHORT' | string;
  strategyId?: string;   // 전략 ID (있으면 Path3에서 사용)
  label?: string;        // alert 이름
  message?: string;      // alert text
  price?: number;
  // 온체인/선물 컨텍스트 (있으면 사용, 없으면 무시)
  fundingRate?: number | string;
  oiChangePct?: number | string;
  priceChangePct?: number | string;
  [key: string]: any;
};

function getNowKst() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

// string/number 섞여 들어오는 값을 number 또는 undefined로 변환
function toNumberOrUndefined(v: any): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  return n;
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

  // =========[ Phase 3: AI/Algorithm Signal 구조 추가 ]=========
  // TradingView / 기타 소스에서 funding, OI 변화율, 가격 변화율 등을 보내면 사용
  const fundingRate =
    toNumberOrUndefined(
      payload.fundingRate ??
        (payload as any).funding ??
        (payload as any).funding_rate,
    ) ?? undefined;

  const oiChangePct =
    toNumberOrUndefined(
      payload.oiChangePct ??
        (payload as any).oi_change ??
        (payload as any).oiChange ??
        (payload as any).oiChangePct,
    ) ?? undefined;

  const priceChangePct =
    toNumberOrUndefined(
      payload.priceChangePct ??
        (payload as any).price_change ??
        (payload as any).priceChange ??
        (payload as any).priceChangePct,
    ) ?? undefined;

  // 규칙 기반 신뢰도 점수 계산 (나중에 AI 모델로 교체 가능)
  const { score, grade } = computeRuleScore(payload.strategyId, {
    fundingRate,
    oiChangePct,
    priceChangePct,
  });

  // 1) Firestore 에 raw 시그널 저장
  const col = adminDB.collection('signals_raw');
  const docRef = await col.add({
    ...payload,                 // 원본 payload 全부 남겨두기
    symbol,
    side,
    createdAt: now,
    createdAtMs: now.getTime(),
    source: 'tradingview',

    // Phase 3: 시그널 타입 + 전략 ID + 점수/등급
    type: 'rule',               // rule | ai 중 현재는 rule
    strategyId: payload.strategyId ?? null,
    fundingRate: fundingRate ?? null,
    oiChangePct: oiChangePct ?? null,
    priceChangePct: priceChangePct ?? null,
    score,                      // 0~100
    grade,                      // 'A' | 'B' | 'C' | 'D'
  });

  console.log(
    '[TV] signal saved:',
    docRef.id,
    symbol,
    side,
    'score:',
    score,
    'grade:',
    grade,
  );

  // 2) Path1: 템플릿 기반 토픽 푸시 (다국어 지원)
  //    → lib/notification-rules.ts + lib/server-push.ts 에서
  //      제목/본문을 알아서 생성해서,
  //      signals / sym-<심볼> 토픽으로 푸시를 쏩니다.
  await pushTvSignalToTopics({
    ...payload,
    symbol,
    side,
    docId: docRef.id,
    score,
    grade, // 나중에 알림 문구에 신뢰도 표시하고 싶을 때 사용 가능
  });

  // 3) Path3: 전략 진입 신호 관련 사용자 조건 처리 (기존 로직 유지)
  await checkUserRulesForTvSignal({
    id: docRef.id,
    ...payload,
    symbol,
    side,
    score,
    grade,
  });

  return NextResponse.json({ ok: true, id: docRef.id });
}


